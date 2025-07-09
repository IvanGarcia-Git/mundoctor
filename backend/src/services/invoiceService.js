import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { createAuditLog } from '../utils/auditLog.js';
import notificationService, { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } from './notificationService.js';
import emailService from './emailService.js';
import pdfGenerator from '../utils/pdfGenerator.js';
import {
  INVOICE_STATUSES,
  CURRENCY_CODES,
  generateInvoiceNumber,
  calculateTax,
  calculateTotal,
  formatCurrency
} from '../models/paymentModel.js';
import path from 'path';
import fs from 'fs';

class InvoiceService {
  constructor() {
    this.taxRate = 0.16; // 16% IVA in Mexico
  }

  // Create invoice
  async createInvoice({
    userId,
    subscriptionId = null,
    paymentId = null,
    items = [],
    notes = '',
    dueDate = null,
    currency = 'MXN',
    metadata = {}
  }) {
    try {
      logger.info(`Creating invoice for user ${userId}`);

      // Get customer information
      const customerQuery = 'SELECT * FROM users WHERE id = $1';
      const customerResult = await query(customerQuery, [userId]);
      
      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber();

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const tax = calculateTax(subtotal, this.taxRate);
      const total = calculateTotal(subtotal, tax);

      // Set due date (30 days from now if not provided)
      const invoiceDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Create invoice record
      const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const insertInvoiceQuery = `
        INSERT INTO invoices (
          id, user_id, subscription_id, payment_id, invoice_number, 
          status, subtotal, tax, total, currency, due_date,
          customer_info, company_info, notes, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const customerInfo = {
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        postalCode: customer.postal_code,
        country: customer.country || 'México'
      };

      const companyInfo = {
        name: 'Mundoctor',
        address: 'Av. Revolución 1234, Col. Centro',
        city: 'Ciudad de México, CDMX 06000',
        country: 'México',
        phone: '+52 55 1234 5678',
        email: 'facturacion@mundoctor.com',
        rfc: 'MUN123456789'
      };

      const invoiceResult = await query(insertInvoiceQuery, [
        invoiceId,
        userId,
        subscriptionId,
        paymentId,
        invoiceNumber,
        INVOICE_STATUSES.DRAFT,
        subtotal,
        tax,
        total,
        currency,
        invoiceDueDate.toISOString(),
        JSON.stringify(customerInfo),
        JSON.stringify(companyInfo),
        notes,
        JSON.stringify(metadata),
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      const invoice = invoiceResult.rows[0];

      // Create invoice items
      for (const item of items) {
        const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await query(
          `INSERT INTO invoice_items (
            id, invoice_id, description, quantity, unit_price, amount, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            itemId,
            invoiceId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice,
            JSON.stringify(item.metadata || {}),
            new Date().toISOString()
          ]
        );
      }

      // Audit log
      await createAuditLog({
        userId,
        action: 'invoice_created',
        resource: 'invoice',
        resourceId: invoiceId,
        details: {
          invoiceNumber,
          total,
          currency,
          itemsCount: items.length
        }
      });

      logger.info(`Invoice created: ${invoiceNumber} for user ${userId}`);

      return await this.getInvoiceWithItems(invoiceId);

    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Get invoice with items
  async getInvoiceWithItems(invoiceId) {
    try {
      const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
      const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at';

      const [invoiceResult, itemsResult] = await Promise.all([
        query(invoiceQuery, [invoiceId]),
        query(itemsQuery, [invoiceId])
      ]);

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];
      const items = itemsResult.rows;

      return {
        ...invoice,
        customer_info: JSON.parse(invoice.customer_info),
        company_info: JSON.parse(invoice.company_info),
        metadata: JSON.parse(invoice.metadata || '{}'),
        items
      };

    } catch (error) {
      logger.error('Error getting invoice with items:', error);
      throw error;
    }
  }

  // Generate PDF for invoice
  async generateInvoicePDF(invoiceId) {
    try {
      logger.info(`Generating PDF for invoice ${invoiceId}`);

      const invoice = await this.getInvoiceWithItems(invoiceId);
      
      // Generate PDF
      const pdfBuffer = await pdfGenerator.generateInvoice(invoice);
      
      // Save PDF to file
      const filename = `invoice_${invoice.invoice_number}_${Date.now()}.pdf`;
      const filePath = await pdfGenerator.savePDFToFile(pdfBuffer, filename);
      
      // Update invoice with PDF URL
      const pdfUrl = `/uploads/invoices/${filename}`;
      await query(
        'UPDATE invoices SET pdf_url = $1, updated_at = $2 WHERE id = $3',
        [pdfUrl, new Date().toISOString(), invoiceId]
      );

      // Audit log
      await createAuditLog({
        userId: invoice.user_id,
        action: 'invoice_pdf_generated',
        resource: 'invoice',
        resourceId: invoiceId,
        details: {
          filename,
          pdfUrl
        }
      });

      logger.info(`PDF generated for invoice ${invoice.invoice_number}: ${filename}`);

      return {
        pdfBuffer,
        filePath,
        pdfUrl,
        filename
      };

    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  // Send invoice by email
  async sendInvoiceByEmail(invoiceId) {
    try {
      logger.info(`Sending invoice ${invoiceId} by email`);

      const invoice = await this.getInvoiceWithItems(invoiceId);
      
      // Generate PDF if not exists
      let pdfData;
      if (!invoice.pdf_url) {
        pdfData = await this.generateInvoicePDF(invoiceId);
      } else {
        const filename = path.basename(invoice.pdf_url);
        const filePath = path.join(process.cwd(), 'backend/uploads/invoices', filename);
        pdfData = {
          pdfBuffer: fs.readFileSync(filePath),
          filename
        };
      }

      // Send email with PDF attachment
      const emailResult = await emailService.sendEmail(
        invoice.customer_info.email,
        `Factura ${invoice.invoice_number} - Mundoctor`,
        `<p>Estimado/a ${invoice.customer_info.name},</p><p>Adjuntamos su factura ${invoice.invoice_number}.</p>`,
        `Estimado/a ${invoice.customer_info.name}, adjuntamos su factura ${invoice.invoice_number}.`
      );

      if (emailResult.success) {
        // Update invoice status
        await query(
          'UPDATE invoices SET status = $1, sent_at = $2, updated_at = $3 WHERE id = $4',
          [INVOICE_STATUSES.SENT, new Date().toISOString(), new Date().toISOString(), invoiceId]
        );

        // Send notification
        await notificationService.sendNotification({
          userId: invoice.user_id,
          type: NOTIFICATION_TYPES.PAYMENT_SUCCESSFUL,
          title: 'Factura Enviada',
          message: `Tu factura ${invoice.invoice_number} ha sido enviada por email`,
          channels: [NOTIFICATION_CHANNELS.WEBSOCKET],
          variables: {
            invoiceNumber: invoice.invoice_number,
            total: formatCurrency(invoice.total, invoice.currency)
          }
        });

        // Audit log
        await createAuditLog({
          userId: invoice.user_id,
          action: 'invoice_sent',
          resource: 'invoice',
          resourceId: invoiceId,
          details: {
            email: invoice.customer_info.email,
            messageId: emailResult.messageId
          }
        });
      }

      logger.info(`Invoice ${invoice.invoice_number} sent by email`);
      return emailResult;

    } catch (error) {
      logger.error('Error sending invoice by email:', error);
      throw error;
    }
  }

  // Mark invoice as paid
  async markInvoiceAsPaid(invoiceId, paymentId = null) {
    try {
      logger.info(`Marking invoice ${invoiceId} as paid`);

      const invoice = await this.getInvoiceWithItems(invoiceId);
      
      // Update invoice status
      await query(
        'UPDATE invoices SET status = $1, payment_id = $2, paid_at = $3, updated_at = $4 WHERE id = $5',
        [
          INVOICE_STATUSES.PAID,
          paymentId,
          new Date().toISOString(),
          new Date().toISOString(),
          invoiceId
        ]
      );

      // Send notification
      await notificationService.sendNotification({
        userId: invoice.user_id,
        type: NOTIFICATION_TYPES.PAYMENT_SUCCESSFUL,
        title: 'Factura Pagada',
        message: `Tu factura ${invoice.invoice_number} ha sido pagada exitosamente`,
        channels: [NOTIFICATION_CHANNELS.WEBSOCKET, NOTIFICATION_CHANNELS.EMAIL],
        variables: {
          invoiceNumber: invoice.invoice_number,
          total: formatCurrency(invoice.total, invoice.currency)
        }
      });

      // Audit log
      await createAuditLog({
        userId: invoice.user_id,
        action: 'invoice_paid',
        resource: 'invoice',
        resourceId: invoiceId,
        details: {
          paymentId,
          amount: invoice.total
        }
      });

      logger.info(`Invoice ${invoice.invoice_number} marked as paid`);
      return invoice;

    } catch (error) {
      logger.error('Error marking invoice as paid:', error);
      throw error;
    }
  }

  // Get user invoices
  async getUserInvoices(userId, page = 1, limit = 20, status = null) {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE i.user_id = $1';
      const queryParams = [userId];
      
      if (status) {
        whereClause += ' AND i.status = $2';
        queryParams.push(status);
        queryParams.push(limit);
        queryParams.push(offset);
      } else {
        queryParams.push(limit);
        queryParams.push(offset);
      }

      const invoicesQuery = `
        SELECT i.*, 
          COUNT(ii.id) as items_count,
          u.first_name, u.last_name, u.email
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        JOIN users u ON i.user_id = u.id
        ${whereClause}
        GROUP BY i.id, u.first_name, u.last_name, u.email
        ORDER BY i.created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;

      const countQuery = `SELECT COUNT(*) FROM invoices i ${whereClause}`;
      const countParams = status ? [userId, status] : [userId];

      const [invoicesResult, countResult] = await Promise.all([
        query(invoicesQuery, queryParams),
        query(countQuery, countParams)
      ]);

      const invoices = invoicesResult.rows.map(invoice => ({
        ...invoice,
        customer_info: JSON.parse(invoice.customer_info),
        company_info: JSON.parse(invoice.company_info),
        metadata: JSON.parse(invoice.metadata || '{}')
      }));

      const total = parseInt(countResult.rows[0].count);

      return {
        invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting user invoices:', error);
      throw error;
    }
  }

  // Create subscription invoice
  async createSubscriptionInvoice(subscriptionId) {
    try {
      logger.info(`Creating subscription invoice for subscription ${subscriptionId}`);

      // Get subscription details
      const subscriptionQuery = `
        SELECT s.*, sp.name as plan_name, sp.description, sp.features,
          u.id, u.first_name, u.last_name, u.email
        FROM subscriptions s
        JOIN subscription_plans sp ON s.plan_id = sp.id
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1
      `;

      const subscriptionResult = await query(subscriptionQuery, [subscriptionId]);
      
      if (subscriptionResult.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      const subscription = subscriptionResult.rows[0];

      // Create invoice items
      const items = [{
        description: `Suscripción ${subscription.plan_name} - ${subscription.interval}`,
        quantity: 1,
        unitPrice: subscription.amount,
        metadata: {
          subscriptionId,
          planId: subscription.plan_id,
          period: `${new Date(subscription.current_period_start).toLocaleDateString('es-MX')} - ${new Date(subscription.current_period_end).toLocaleDateString('es-MX')}`
        }
      }];

      // Create invoice
      const invoice = await this.createInvoice({
        userId: subscription.user_id,
        subscriptionId,
        items,
        notes: `Factura de suscripción válida desde ${new Date(subscription.current_period_start).toLocaleDateString('es-MX')} hasta ${new Date(subscription.current_period_end).toLocaleDateString('es-MX')}`,
        currency: subscription.currency,
        metadata: {
          subscriptionId,
          planName: subscription.plan_name,
          interval: subscription.interval
        }
      });

      logger.info(`Subscription invoice created: ${invoice.invoice_number}`);
      return invoice;

    } catch (error) {
      logger.error('Error creating subscription invoice:', error);
      throw error;
    }
  }

  // Auto-send invoices for subscriptions
  async autoSendSubscriptionInvoices() {
    try {
      logger.info('Auto-sending subscription invoices...');

      // Get active subscriptions that need invoicing
      const subscriptionsQuery = `
        SELECT s.*
        FROM subscriptions s
        WHERE s.status = 'active'
          AND s.current_period_end::date = CURRENT_DATE + INTERVAL '1 day'
          AND NOT EXISTS (
            SELECT 1 FROM invoices i 
            WHERE i.subscription_id = s.id 
              AND i.created_at::date = CURRENT_DATE
          )
      `;

      const subscriptionsResult = await query(subscriptionsQuery);
      const subscriptions = subscriptionsResult.rows;

      logger.info(`Found ${subscriptions.length} subscriptions to invoice`);

      for (const subscription of subscriptions) {
        try {
          // Create invoice
          const invoice = await this.createSubscriptionInvoice(subscription.id);
          
          // Generate PDF
          await this.generateInvoicePDF(invoice.id);
          
          // Send by email
          await this.sendInvoiceByEmail(invoice.id);
          
          logger.info(`Auto-sent invoice for subscription ${subscription.id}`);

        } catch (error) {
          logger.error(`Failed to auto-send invoice for subscription ${subscription.id}:`, error);
        }
      }

      // Audit log
      await createAuditLog({
        userId: 'system',
        action: 'invoices_auto_sent',
        resource: 'invoices',
        details: { count: subscriptions.length }
      });

      logger.info(`Auto-send subscription invoices completed. Sent ${subscriptions.length} invoices.`);
      return subscriptions.length;

    } catch (error) {
      logger.error('Error auto-sending subscription invoices:', error);
      throw error;
    }
  }

  // Get invoice statistics
  async getInvoiceStatistics(userId = null) {
    try {
      let whereClause = '';
      const queryParams = [];

      if (userId) {
        whereClause = 'WHERE user_id = $1';
        queryParams.push(userId);
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_invoices,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status != 'paid' THEN total ELSE 0 END), 0) as outstanding_amount,
          AVG(total) as average_invoice_amount
        FROM invoices ${whereClause}
      `;

      const statsResult = await query(statsQuery, queryParams);
      const stats = statsResult.rows[0];

      return {
        totalInvoices: parseInt(stats.total_invoices),
        paidInvoices: parseInt(stats.paid_invoices),
        sentInvoices: parseInt(stats.sent_invoices),
        overdueInvoices: parseInt(stats.overdue_invoices),
        totalRevenue: parseInt(stats.total_revenue),
        outstandingAmount: parseInt(stats.outstanding_amount),
        averageInvoiceAmount: parseFloat(stats.average_invoice_amount) || 0,
        paymentRate: stats.total_invoices > 0 ? (stats.paid_invoices / stats.total_invoices * 100).toFixed(2) : 0
      };

    } catch (error) {
      logger.error('Error getting invoice statistics:', error);
      throw error;
    }
  }
}

// Create singleton instance
const invoiceService = new InvoiceService();

export default invoiceService;