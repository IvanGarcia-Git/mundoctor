import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
// import { validateRequest } from '../middleware/validation.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import paymentService from '../services/paymentService.js';
import invoiceService from '../services/invoiceService.js';
import {
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  SUBSCRIPTION_STATUSES,
  INVOICE_STATUSES,
  validatePaymentAmount,
  validateCurrency,
  formatCurrency
} from '../models/paymentModel.js';

const router = express.Router();

// ================== PAYMENT INTENTS ==================

// Create payment intent
router.post('/intent', requireAuth, async (req, res) => {
  try {
    const {
      amount,
      currency = 'MXN',
      paymentType = PAYMENT_TYPES.SUBSCRIPTION,
      description,
      appointmentId,
      subscriptionId,
      metadata = {}
    } = req.body;

    if (!validatePaymentAmount(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount'
      });
    }

    if (!validateCurrency(currency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }

    const result = await paymentService.createPaymentIntent({
      userId: req.user.userId,
      amount,
      currency,
      paymentType,
      description,
      metadata,
      appointmentId,
      subscriptionId
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Confirm payment intent
router.post('/intent/:intentId/confirm', requireAuth, async (req, res) => {
  try {
    const { intentId } = req.params;
    const { paymentMethodId } = req.body;

    const result = await paymentService.confirmPayment(intentId, paymentMethodId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== SUBSCRIPTIONS ==================

// Create subscription
router.post('/subscriptions', requireAuth, async (req, res) => {
  try {
    const { planId, priceId, paymentMethodId, trialPeriodDays = 0 } = req.body;

    const result = await paymentService.createSubscription({
      userId: req.user.userId,
      planId,
      priceId,
      paymentMethodId,
      trialPeriodDays
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user subscription
router.get('/subscriptions/current', requireAuth, async (req, res) => {
  try {
    const subscription = await paymentService.getSubscriptionDetails(req.user.userId);

    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    logger.error('Error getting subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel subscription
router.post('/subscriptions/:subscriptionId/cancel', requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;

    // Verify subscription belongs to user
    const subscriptionQuery = 'SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2';
    const subscriptionResult = await query(subscriptionQuery, [subscriptionId, req.user.userId]);
    
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const result = await paymentService.cancelSubscription(subscriptionId, cancelAtPeriodEnd);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== PAYMENT HISTORY ==================

// Get payment history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await paymentService.getPaymentHistory(req.user.userId, page, limit);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific payment
router.get('/payments/:paymentId', requireAuth, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentQuery = `
      SELECT p.*, u.first_name, u.last_name, u.email
      FROM payments p
      JOIN users u ON p.user_id = u.clerk_id
      WHERE p.id = $1 AND p.user_id = $2
    `;

    const paymentResult = await query(paymentQuery, [paymentId, req.user.userId]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    logger.error('Error getting payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== INVOICES ==================

// Get user invoices
router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || null;

    const result = await invoiceService.getUserInvoices(req.user.userId, page, limit, status);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error getting invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific invoice
router.get('/invoices/:invoiceId', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await invoiceService.getInvoiceWithItems(invoiceId);
    
    // Verify invoice belongs to user
    if (invoice.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    logger.error('Error getting invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download invoice PDF
router.get('/invoices/:invoiceId/pdf', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await invoiceService.getInvoiceWithItems(invoiceId);
    
    // Verify invoice belongs to user
    if (invoice.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Generate or get existing PDF
    let pdfData;
    if (!invoice.pdf_url) {
      pdfData = await invoiceService.generateInvoicePDF(invoiceId);
    } else {
      // Return existing PDF URL
      return res.json({
        success: true,
        data: {
          pdfUrl: invoice.pdf_url,
          downloadUrl: `${req.protocol}://${req.get('host')}${invoice.pdf_url}`
        }
      });
    }

    res.json({
      success: true,
      data: {
        pdfUrl: pdfData.pdfUrl,
        downloadUrl: `${req.protocol}://${req.get('host')}${pdfData.pdfUrl}`
      }
    });

  } catch (error) {
    logger.error('Error downloading invoice PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Resend invoice by email
router.post('/invoices/:invoiceId/resend', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await invoiceService.getInvoiceWithItems(invoiceId);
    
    // Verify invoice belongs to user
    if (invoice.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const result = await invoiceService.sendInvoiceByEmail(invoiceId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error resending invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== WEBHOOKS ==================

// Stripe webhook endpoint
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing stripe signature'
      });
    }

    const result = await paymentService.processWebhookEvent(req.body, signature);

    res.json(result);

  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ================== ADMIN ROUTES ==================

// Get all payments (admin only)
router.get('/admin/payments', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status || null;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams = [];

    if (status) {
      whereClause = 'WHERE p.status = $1';
      queryParams.push(status);
      queryParams.push(limit);
      queryParams.push(offset);
    } else {
      queryParams.push(limit);
      queryParams.push(offset);
    }

    const paymentsQuery = `
      SELECT p.*, u.first_name, u.last_name, u.email, u.role
      FROM payments p
      JOIN users u ON p.user_id = u.clerk_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const countQuery = `SELECT COUNT(*) FROM payments p ${whereClause}`;
    const countParams = status ? [status] : [];

    const [paymentsResult, countResult] = await Promise.all([
      query(paymentsQuery, queryParams),
      query(countQuery, countParams)
    ]);

    const payments = paymentsResult.rows;
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting admin payments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get payment statistics (admin only)
router.get('/admin/statistics', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const period = req.query.period || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const statsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as average_payment,
        COUNT(DISTINCT user_id) as unique_customers
      FROM payments 
      WHERE created_at >= $1
    `;

    const subscriptionStatsQuery = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
        COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0) as monthly_revenue
      FROM subscriptions
    `;

    const [statsResult, subscriptionStatsResult] = await Promise.all([
      query(statsQuery, [startDate.toISOString()]),
      query(subscriptionStatsQuery)
    ]);

    const paymentStats = statsResult.rows[0];
    const subscriptionStats = subscriptionStatsResult.rows[0];

    // Get invoice statistics
    const invoiceStats = await invoiceService.getInvoiceStatistics();

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        payments: {
          total: parseInt(paymentStats.total_payments),
          successful: parseInt(paymentStats.successful_payments),
          failed: parseInt(paymentStats.failed_payments),
          revenue: parseInt(paymentStats.total_revenue),
          averageAmount: parseFloat(paymentStats.average_payment) || 0,
          uniqueCustomers: parseInt(paymentStats.unique_customers),
          successRate: paymentStats.total_payments > 0 
            ? ((paymentStats.successful_payments / paymentStats.total_payments) * 100).toFixed(2)
            : 0
        },
        subscriptions: {
          total: parseInt(subscriptionStats.total_subscriptions),
          active: parseInt(subscriptionStats.active_subscriptions),
          cancelled: parseInt(subscriptionStats.cancelled_subscriptions),
          monthlyRevenue: parseInt(subscriptionStats.monthly_revenue),
          churnRate: subscriptionStats.total_subscriptions > 0
            ? ((subscriptionStats.cancelled_subscriptions / subscriptionStats.total_subscriptions) * 100).toFixed(2)
            : 0
        },
        invoices: invoiceStats
      }
    });

  } catch (error) {
    logger.error('Error getting payment statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all invoices (admin only)
router.get('/admin/invoices', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status || null;

    const result = await invoiceService.getUserInvoices(null, page, limit, status);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error getting admin invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual invoice sending (admin only)
router.post('/admin/invoices/send-pending', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const count = await invoiceService.autoSendSubscriptionInvoices();

    res.json({
      success: true,
      data: {
        invoicesSent: count,
        message: `${count} invoices sent successfully`
      }
    });

  } catch (error) {
    logger.error('Error sending pending invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;