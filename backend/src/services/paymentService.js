import Stripe from 'stripe';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { createAuditLog } from '../utils/auditLog.js';
import notificationService, { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } from './notificationService.js';
import {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_INTERVALS,
  validatePaymentAmount,
  validateCurrency,
  generateInvoiceNumber,
  calculateTax,
  calculateTotal
} from '../models/paymentModel.js';

class PaymentService {
  constructor() {
    this.stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
    this.clerkSecretKey = process.env.CLERK_SECRET_KEY;
  }

  // Create a payment intent
  async createPaymentIntent({
    userId,
    amount,
    currency = 'MXN',
    paymentType = PAYMENT_TYPES.SUBSCRIPTION,
    description,
    metadata = {},
    appointmentId = null,
    subscriptionId = null
  }) {
    try {
      logger.info(`Creating payment intent for user ${userId}, amount: ${amount}`);

      // Validate inputs
      if (!validatePaymentAmount(amount)) {
        throw new Error('Invalid payment amount');
      }

      if (!validateCurrency(currency)) {
        throw new Error('Invalid currency');
      }

      // Get customer info
      const customerQuery = 'SELECT * FROM users WHERE id = $1';
      const customerResult = await query(customerQuery, [userId]);
      
      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Create or get Stripe customer
      let stripeCustomer;
      if (customer.stripe_customer_id) {
        stripeCustomer = await this.stripe.customers.retrieve(customer.stripe_customer_id);
      } else {
        stripeCustomer = await this.stripe.customers.create({
          email: customer.email,
          name: `${customer.first_name} ${customer.last_name}`,
          metadata: {
            userId: userId
          }
        });

        // Save Stripe customer ID
        await query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomer.id, userId]
        );
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount in cents
        currency: currency.toLowerCase(),
        customer: stripeCustomer.id,
        description,
        metadata: {
          userId,
          paymentType,
          appointmentId: appointmentId || '',
          subscriptionId: subscriptionId || '',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      // Create payment record
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const insertPaymentQuery = `
        INSERT INTO payments (
          id, user_id, amount, currency, status, payment_method, 
          payment_type, stripe_payment_intent_id, description, 
          metadata, appointment_id, subscription_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const paymentResult = await query(insertPaymentQuery, [
        paymentId,
        userId,
        amount,
        currency,
        PAYMENT_STATUSES.PENDING,
        PAYMENT_METHODS.STRIPE,
        paymentType,
        paymentIntent.id,
        description,
        JSON.stringify(metadata),
        appointmentId,
        subscriptionId,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      const payment = paymentResult.rows[0];

      // Audit log
      await createAuditLog({
        userId,
        action: 'payment_intent_created',
        resource: 'payment',
        resourceId: paymentId,
        details: {
          amount,
          currency,
          paymentType,
          stripePaymentIntentId: paymentIntent.id
        }
      });

      logger.info(`Payment intent created: ${paymentIntent.id} for user ${userId}`);

      return {
        payment,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };

    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId, paymentMethodId = null) {
    try {
      logger.info(`Confirming payment intent: ${paymentIntentId}`);

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentMethodId) {
        await this.stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: paymentMethodId
        });
      }

      // Update payment status
      await query(
        'UPDATE payments SET status = $1, updated_at = $2 WHERE stripe_payment_intent_id = $3',
        [PAYMENT_STATUSES.PROCESSING, new Date().toISOString(), paymentIntentId]
      );

      logger.info(`Payment confirmed: ${paymentIntentId}`);
      return paymentIntent;

    } catch (error) {
      logger.error('Error confirming payment:', error);
      throw error;
    }
  }

  // Process successful payment
  async processSuccessfulPayment(paymentIntentId) {
    try {
      logger.info(`Processing successful payment: ${paymentIntentId}`);

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Get payment record
      const paymentQuery = 'SELECT * FROM payments WHERE stripe_payment_intent_id = $1';
      const paymentResult = await query(paymentQuery, [paymentIntentId]);
      
      if (paymentResult.rows.length === 0) {
        throw new Error('Payment record not found');
      }

      const payment = paymentResult.rows[0];

      // Update payment status
      await query(
        `UPDATE payments SET 
          status = $1, 
          stripe_charge_id = $2, 
          updated_at = $3
        WHERE id = $4`,
        [
          PAYMENT_STATUSES.COMPLETED,
          paymentIntent.charges.data[0]?.id,
          new Date().toISOString(),
          payment.id
        ]
      );

      // Create transaction record
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await query(
        `INSERT INTO transactions (
          id, user_id, payment_id, type, amount, currency, 
          status, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          transactionId,
          payment.user_id,
          payment.id,
          'payment',
          payment.amount,
          payment.currency,
          'completed',
          `Payment for ${payment.payment_type}`,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      // Send notification
      await notificationService.sendNotification({
        userId: payment.user_id,
        type: NOTIFICATION_TYPES.PAYMENT_SUCCESSFUL,
        channels: [NOTIFICATION_CHANNELS.WEBSOCKET, NOTIFICATION_CHANNELS.EMAIL],
        variables: {
          amount: payment.amount,
          currency: payment.currency,
          description: payment.description
        }
      });

      // Audit log
      await createAuditLog({
        userId: payment.user_id,
        action: 'payment_completed',
        resource: 'payment',
        resourceId: payment.id,
        details: {
          amount: payment.amount,
          paymentIntentId
        }
      });

      logger.info(`Payment processed successfully: ${payment.id}`);
      return payment;

    } catch (error) {
      logger.error('Error processing successful payment:', error);
      throw error;
    }
  }

  // Process failed payment
  async processFailedPayment(paymentIntentId, failureReason) {
    try {
      logger.info(`Processing failed payment: ${paymentIntentId}`);

      // Get payment record
      const paymentQuery = 'SELECT * FROM payments WHERE stripe_payment_intent_id = $1';
      const paymentResult = await query(paymentQuery, [paymentIntentId]);
      
      if (paymentResult.rows.length === 0) {
        throw new Error('Payment record not found');
      }

      const payment = paymentResult.rows[0];

      // Update payment status
      await query(
        'UPDATE payments SET status = $1, failure_reason = $2, updated_at = $3 WHERE id = $4',
        [PAYMENT_STATUSES.FAILED, failureReason, new Date().toISOString(), payment.id]
      );

      // Send notification
      await notificationService.sendNotification({
        userId: payment.user_id,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        channels: [NOTIFICATION_CHANNELS.WEBSOCKET, NOTIFICATION_CHANNELS.EMAIL],
        variables: {
          amount: payment.amount,
          currency: payment.currency,
          reason: failureReason
        }
      });

      // Audit log
      await createAuditLog({
        userId: payment.user_id,
        action: 'payment_failed',
        resource: 'payment',
        resourceId: payment.id,
        details: {
          failureReason,
          paymentIntentId
        }
      });

      logger.info(`Payment failed: ${payment.id}`);
      return payment;

    } catch (error) {
      logger.error('Error processing failed payment:', error);
      throw error;
    }
  }

  // Create subscription
  async createSubscription({
    userId,
    planId,
    priceId,
    paymentMethodId,
    trialPeriodDays = 0
  }) {
    try {
      logger.info(`Creating subscription for user ${userId}, plan: ${planId}`);

      // Get customer info
      const customerQuery = 'SELECT * FROM users WHERE id = $1';
      const customerResult = await query(customerQuery, [userId]);
      
      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get or create Stripe customer
      let stripeCustomer;
      if (customer.stripe_customer_id) {
        stripeCustomer = await this.stripe.customers.retrieve(customer.stripe_customer_id);
      } else {
        stripeCustomer = await this.stripe.customers.create({
          email: customer.email,
          name: `${customer.first_name} ${customer.last_name}`,
          metadata: { userId }
        });

        await query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomer.id, userId]
        );
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomer.id
      });

      // Set as default payment method
      await this.stripe.customers.update(stripeCustomer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // Create subscription
      const subscriptionData = {
        customer: stripeCustomer.id,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          planId
        }
      };

      if (trialPeriodDays > 0) {
        subscriptionData.trial_period_days = trialPeriodDays;
      }

      const stripeSubscription = await this.stripe.subscriptions.create(subscriptionData);

      // Get plan details
      const planQuery = 'SELECT * FROM subscription_plans WHERE id = $1';
      const planResult = await query(planQuery, [planId]);
      const plan = planResult.rows[0];

      // Create subscription record
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const insertSubscriptionQuery = `
        INSERT INTO subscriptions (
          id, user_id, plan_id, plan_name, status, interval, 
          amount, currency, stripe_subscription_id, stripe_customer_id,
          current_period_start, current_period_end, trial_start, trial_end,
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const subscriptionResult = await query(insertSubscriptionQuery, [
        subscriptionId,
        userId,
        planId,
        plan.name,
        SUBSCRIPTION_STATUSES.ACTIVE,
        plan.interval,
        plan.amount,
        plan.currency,
        stripeSubscription.id,
        stripeCustomer.id,
        new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
        stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
        JSON.stringify({ planId }),
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      const subscription = subscriptionResult.rows[0];

      // Audit log
      await createAuditLog({
        userId,
        action: 'subscription_created',
        resource: 'subscription',
        resourceId: subscriptionId,
        details: {
          planId,
          stripeSubscriptionId: stripeSubscription.id,
          trialPeriodDays
        }
      });

      logger.info(`Subscription created: ${subscriptionId} for user ${userId}`);

      return {
        subscription,
        stripeSubscription,
        clientSecret: stripeSubscription.latest_invoice.payment_intent?.client_secret
      };

    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      logger.info(`Canceling subscription: ${subscriptionId}`);

      // Get subscription record
      const subscriptionQuery = 'SELECT * FROM subscriptions WHERE id = $1';
      const subscriptionResult = await query(subscriptionQuery, [subscriptionId]);
      
      if (subscriptionResult.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      const subscription = subscriptionResult.rows[0];

      // Cancel in Stripe
      let stripeSubscription;
      if (cancelAtPeriodEnd) {
        stripeSubscription = await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true
        });
      } else {
        stripeSubscription = await this.stripe.subscriptions.del(subscription.stripe_subscription_id);
      }

      // Update subscription record
      const updateData = {
        cancelAtPeriodEnd,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!cancelAtPeriodEnd) {
        updateData.status = SUBSCRIPTION_STATUSES.CANCELLED;
      }

      await query(
        `UPDATE subscriptions SET 
          cancel_at_period_end = $1, 
          cancelled_at = $2, 
          status = CASE WHEN $3 = false THEN $4 ELSE status END,
          updated_at = $5
        WHERE id = $6`,
        [
          cancelAtPeriodEnd,
          updateData.cancelledAt,
          cancelAtPeriodEnd,
          SUBSCRIPTION_STATUSES.CANCELLED,
          updateData.updatedAt,
          subscriptionId
        ]
      );

      // Audit log
      await createAuditLog({
        userId: subscription.user_id,
        action: 'subscription_cancelled',
        resource: 'subscription',
        resourceId: subscriptionId,
        details: {
          cancelAtPeriodEnd,
          stripeSubscriptionId: subscription.stripe_subscription_id
        }
      });

      logger.info(`Subscription cancelled: ${subscriptionId}`);
      return stripeSubscription;

    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Get payment history
  async getPaymentHistory(userId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const paymentsQuery = `
        SELECT p.*, u.first_name, u.last_name, u.email
        FROM payments p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = 'SELECT COUNT(*) FROM payments WHERE user_id = $1';

      const [paymentsResult, countResult] = await Promise.all([
        query(paymentsQuery, [userId, limit, offset]),
        query(countQuery, [userId])
      ]);

      const payments = paymentsResult.rows;
      const total = parseInt(countResult.rows[0].count);

      return {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting payment history:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscriptionDetails(userId) {
    try {
      const subscriptionQuery = `
        SELECT s.*, sp.features, sp.description
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 1
      `;

      const subscriptionResult = await query(subscriptionQuery, [userId]);
      
      if (subscriptionResult.rows.length === 0) {
        return null;
      }

      const subscription = subscriptionResult.rows[0];

      // Get Stripe subscription details
      const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

      return {
        ...subscription,
        stripeDetails: stripeSubscription
      };

    } catch (error) {
      logger.error('Error getting subscription details:', error);
      throw error;
    }
  }

  // Process webhook event
  async processWebhookEvent(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

      logger.info(`Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.processSuccessfulPayment(event.data.object.id);
          break;

        case 'payment_intent.payment_failed':
          await this.processFailedPayment(event.data.object.id, event.data.object.last_payment_error?.message);
          break;

        case 'invoice.payment_succeeded':
          await this.processInvoicePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.processInvoicePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.processSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.processSubscriptionDeleted(event.data.object);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      // Store webhook event
      await this.storeWebhookEvent(event);

      return { received: true };

    } catch (error) {
      logger.error('Error processing webhook event:', error);
      throw error;
    }
  }

  // Store webhook event
  async storeWebhookEvent(event) {
    try {
      const eventId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await query(
        `INSERT INTO webhook_events (
          id, source, event_type, event_id, data, processed, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          eventId,
          'stripe',
          event.type,
          event.id,
          JSON.stringify(event.data),
          true,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

    } catch (error) {
      logger.error('Error storing webhook event:', error);
    }
  }

  // Process subscription updated
  async processSubscriptionUpdated(subscription) {
    try {
      await query(
        `UPDATE subscriptions SET 
          status = $1,
          current_period_start = $2,
          current_period_end = $3,
          cancel_at_period_end = $4,
          updated_at = $5
        WHERE stripe_subscription_id = $6`,
        [
          subscription.status,
          new Date(subscription.current_period_start * 1000).toISOString(),
          new Date(subscription.current_period_end * 1000).toISOString(),
          subscription.cancel_at_period_end,
          new Date().toISOString(),
          subscription.id
        ]
      );

    } catch (error) {
      logger.error('Error processing subscription update:', error);
    }
  }

  // Process subscription deleted
  async processSubscriptionDeleted(subscription) {
    try {
      await query(
        'UPDATE subscriptions SET status = $1, updated_at = $2 WHERE stripe_subscription_id = $3',
        [SUBSCRIPTION_STATUSES.CANCELLED, new Date().toISOString(), subscription.id]
      );

    } catch (error) {
      logger.error('Error processing subscription deletion:', error);
    }
  }

  // Process invoice payment succeeded
  async processInvoicePaymentSucceeded(invoice) {
    try {
      // Create payment record for subscription payment
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await query(
        `INSERT INTO payments (
          id, user_id, amount, currency, status, payment_method, 
          payment_type, stripe_charge_id, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          paymentId,
          invoice.customer,
          invoice.amount_paid,
          invoice.currency,
          PAYMENT_STATUSES.COMPLETED,
          PAYMENT_METHODS.STRIPE,
          PAYMENT_TYPES.SUBSCRIPTION,
          invoice.charge,
          'Subscription payment',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

    } catch (error) {
      logger.error('Error processing invoice payment succeeded:', error);
    }
  }

  // Process invoice payment failed
  async processInvoicePaymentFailed(invoice) {
    try {
      // Handle failed subscription payment
      logger.warn(`Invoice payment failed for customer ${invoice.customer}`);
      
      // Could implement retry logic or notification here
      
    } catch (error) {
      logger.error('Error processing invoice payment failed:', error);
    }
  }
}

// Create singleton instance
const paymentService = new PaymentService();

export default paymentService;