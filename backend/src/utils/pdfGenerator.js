import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import { formatCurrency } from '../models/paymentModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PDFGenerator {
  constructor() {
    this.companyInfo = {
      name: 'Mundoctor',
      address: 'Av. Revolución 1234, Col. Centro',
      city: 'Ciudad de México, CDMX 06000',
      country: 'México',
      phone: '+52 55 1234 5678',
      email: 'facturacion@mundoctor.com',
      website: 'www.mundoctor.com',
      rfc: 'MUN123456789',
      logo: null // Path to logo image
    };
  }

  // Generate invoice PDF
  async generateInvoice(invoiceData) {
    try {
      logger.info(`Generating invoice PDF for invoice ${invoiceData.invoiceNumber}`);

      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      // Collect PDF data
      doc.on('data', chunk => chunks.push(chunk));

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', reject);

        // Generate PDF content
        this.addInvoiceHeader(doc, invoiceData);
        this.addInvoiceDetails(doc, invoiceData);
        this.addCustomerInfo(doc, invoiceData);
        this.addInvoiceItems(doc, invoiceData);
        this.addInvoiceTotals(doc, invoiceData);
        this.addInvoiceFooter(doc, invoiceData);

        doc.end();
      });

    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  // Add invoice header
  addInvoiceHeader(doc, invoiceData) {
    // Company logo (if available)
    if (this.companyInfo.logo && fs.existsSync(this.companyInfo.logo)) {
      doc.image(this.companyInfo.logo, 50, 45, { width: 100 });
    }

    // Company info
    doc.fontSize(20)
       .fillColor('#2563eb')
       .text(this.companyInfo.name, 50, 45, { align: 'right' });

    doc.fontSize(10)
       .fillColor('#666666')
       .text(this.companyInfo.address, 50, 75, { align: 'right' })
       .text(this.companyInfo.city, 50, 90, { align: 'right' })
       .text(this.companyInfo.country, 50, 105, { align: 'right' })
       .text(`Tel: ${this.companyInfo.phone}`, 50, 120, { align: 'right' })
       .text(`Email: ${this.companyInfo.email}`, 50, 135, { align: 'right' })
       .text(`RFC: ${this.companyInfo.rfc}`, 50, 150, { align: 'right' });

    // Invoice title
    doc.fontSize(28)
       .fillColor('#2563eb')
       .text('FACTURA', 50, 200);

    // Draw line
    doc.moveTo(50, 240)
       .lineTo(550, 240)
       .stroke('#e5e7eb');
  }

  // Add invoice details
  addInvoiceDetails(doc, invoiceData) {
    const y = 260;

    // Invoice number
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Número de Factura:', 50, y)
       .fontSize(12)
       .fillColor('#2563eb')
       .text(invoiceData.invoiceNumber, 180, y);

    // Invoice date
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Fecha:', 50, y + 20)
       .fontSize(12)
       .fillColor('#666666')
       .text(new Date(invoiceData.createdAt).toLocaleDateString('es-MX'), 180, y + 20);

    // Due date
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Fecha de Vencimiento:', 50, y + 40)
       .fontSize(12)
       .fillColor('#666666')
       .text(new Date(invoiceData.dueDate).toLocaleDateString('es-MX'), 180, y + 40);

    // Status
    const statusColor = this.getStatusColor(invoiceData.status);
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Estado:', 50, y + 60)
       .fontSize(12)
       .fillColor(statusColor)
       .text(this.getStatusText(invoiceData.status), 180, y + 60);
  }

  // Add customer information
  addCustomerInfo(doc, invoiceData) {
    const y = 360;

    // Customer info header
    doc.fontSize(14)
       .fillColor('#333333')
       .text('Facturar a:', 50, y);

    // Customer details
    const customer = invoiceData.customerInfo;
    doc.fontSize(12)
       .fillColor('#666666')
       .text(customer.name || 'N/A', 50, y + 25)
       .text(customer.email || 'N/A', 50, y + 45)
       .text(customer.phone || 'N/A', 50, y + 65);

    if (customer.address) {
      doc.text(customer.address, 50, y + 85)
         .text(`${customer.city || ''}, ${customer.state || ''} ${customer.postalCode || ''}`, 50, y + 105)
         .text(customer.country || 'México', 50, y + 125);
    }

    // Draw line
    doc.moveTo(50, y + 160)
       .lineTo(550, y + 160)
       .stroke('#e5e7eb');
  }

  // Add invoice items
  addInvoiceItems(doc, invoiceData) {
    const y = 540;

    // Table header
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Descripción', 50, y, { width: 250 })
       .text('Cantidad', 300, y, { width: 80, align: 'center' })
       .text('Precio Unitario', 380, y, { width: 100, align: 'right' })
       .text('Total', 480, y, { width: 100, align: 'right' });

    // Draw header line
    doc.moveTo(50, y + 20)
       .lineTo(550, y + 20)
       .stroke('#e5e7eb');

    // Table rows
    let currentY = y + 35;
    invoiceData.items.forEach((item, index) => {
      doc.fontSize(11)
         .fillColor('#666666')
         .text(item.description, 50, currentY, { width: 250 })
         .text(item.quantity.toString(), 300, currentY, { width: 80, align: 'center' })
         .text(formatCurrency(item.unitPrice, invoiceData.currency), 380, currentY, { width: 100, align: 'right' })
         .text(formatCurrency(item.amount, invoiceData.currency), 480, currentY, { width: 100, align: 'right' });

      currentY += 25;

      // Add new page if needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    });

    // Draw bottom line
    doc.moveTo(50, currentY + 10)
       .lineTo(550, currentY + 10)
       .stroke('#e5e7eb');

    return currentY + 30;
  }

  // Add invoice totals
  addInvoiceTotals(doc, invoiceData) {
    const y = 650;

    // Subtotal
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Subtotal:', 400, y, { width: 80, align: 'right' })
       .text(formatCurrency(invoiceData.subtotal, invoiceData.currency), 480, y, { width: 100, align: 'right' });

    // Tax
    if (invoiceData.tax > 0) {
      doc.text('IVA (16%):', 400, y + 20, { width: 80, align: 'right' })
         .text(formatCurrency(invoiceData.tax, invoiceData.currency), 480, y + 20, { width: 100, align: 'right' });
    }

    // Total
    doc.fontSize(14)
       .fillColor('#2563eb')
       .text('Total:', 400, y + 40, { width: 80, align: 'right' })
       .text(formatCurrency(invoiceData.total, invoiceData.currency), 480, y + 40, { width: 100, align: 'right' });

    // Draw line above total
    doc.moveTo(400, y + 35)
       .lineTo(580, y + 35)
       .stroke('#2563eb');
  }

  // Add invoice footer
  addInvoiceFooter(doc, invoiceData) {
    const y = 720;

    // Payment info
    if (invoiceData.notes) {
      doc.fontSize(10)
         .fillColor('#666666')
         .text('Notas:', 50, y)
         .text(invoiceData.notes, 50, y + 15, { width: 500 });
    }

    // Terms and conditions
    doc.fontSize(9)
       .fillColor('#999999')
       .text('Términos y Condiciones:', 50, y + 60)
       .text('• Los pagos deben realizarse dentro de los 30 días posteriores a la fecha de vencimiento.', 50, y + 75)
       .text('• Esta factura es válida y cumple con los requisitos fiscales vigentes.', 50, y + 90)
       .text('• Para cualquier consulta, contacta con nuestro equipo de facturación.', 50, y + 105);

    // Footer
    doc.fontSize(8)
       .fillColor('#cccccc')
       .text(`Generado el ${new Date().toLocaleDateString('es-MX')} por ${this.companyInfo.name}`, 50, y + 130, { align: 'center' });
  }

  // Generate payment receipt
  async generatePaymentReceipt(paymentData) {
    try {
      logger.info(`Generating payment receipt for payment ${paymentData.id}`);

      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', reject);

        // Generate receipt content
        this.addReceiptHeader(doc, paymentData);
        this.addReceiptDetails(doc, paymentData);
        this.addReceiptFooter(doc, paymentData);

        doc.end();
      });

    } catch (error) {
      logger.error('Error generating payment receipt:', error);
      throw error;
    }
  }

  // Add receipt header
  addReceiptHeader(doc, paymentData) {
    // Company info
    doc.fontSize(20)
       .fillColor('#2563eb')
       .text(this.companyInfo.name, 50, 45, { align: 'center' });

    doc.fontSize(10)
       .fillColor('#666666')
       .text(this.companyInfo.address, 50, 75, { align: 'center' })
       .text(this.companyInfo.city, 50, 90, { align: 'center' })
       .text(`Tel: ${this.companyInfo.phone}`, 50, 105, { align: 'center' });

    // Receipt title
    doc.fontSize(24)
       .fillColor('#2563eb')
       .text('RECIBO DE PAGO', 50, 150, { align: 'center' });

    // Draw line
    doc.moveTo(50, 190)
       .lineTo(550, 190)
       .stroke('#e5e7eb');
  }

  // Add receipt details
  addReceiptDetails(doc, paymentData) {
    const y = 220;

    // Payment details
    doc.fontSize(12)
       .fillColor('#333333')
       .text('ID de Pago:', 50, y)
       .text(paymentData.id, 200, y)
       .text('Fecha:', 50, y + 25)
       .text(new Date(paymentData.createdAt).toLocaleDateString('es-MX'), 200, y + 25)
       .text('Monto:', 50, y + 50)
       .text(formatCurrency(paymentData.amount, paymentData.currency), 200, y + 50)
       .text('Método de Pago:', 50, y + 75)
       .text(this.getPaymentMethodText(paymentData.paymentMethod), 200, y + 75)
       .text('Estado:', 50, y + 100)
       .fillColor(this.getStatusColor(paymentData.status))
       .text(this.getStatusText(paymentData.status), 200, y + 100);

    if (paymentData.description) {
      doc.fillColor('#333333')
         .text('Descripción:', 50, y + 125)
         .text(paymentData.description, 200, y + 125);
    }
  }

  // Add receipt footer
  addReceiptFooter(doc, paymentData) {
    const y = 450;

    doc.fontSize(10)
       .fillColor('#666666')
       .text('Gracias por su pago. Este recibo es válido como comprobante de pago.', 50, y, { align: 'center' });

    doc.fontSize(8)
       .fillColor('#cccccc')
       .text(`Generado el ${new Date().toLocaleDateString('es-MX')} por ${this.companyInfo.name}`, 50, y + 50, { align: 'center' });
  }

  // Save PDF to file
  async savePDFToFile(pdfBuffer, filename) {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads/invoices');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);

      logger.info(`PDF saved to ${filePath}`);
      return filePath;

    } catch (error) {
      logger.error('Error saving PDF to file:', error);
      throw error;
    }
  }

  // Helper methods
  getStatusColor(status) {
    const colors = {
      'paid': '#10b981',
      'sent': '#3b82f6',
      'draft': '#6b7280',
      'overdue': '#ef4444',
      'cancelled': '#ef4444',
      'completed': '#10b981',
      'pending': '#f59e0b',
      'failed': '#ef4444'
    };
    return colors[status] || '#6b7280';
  }

  getStatusText(status) {
    const texts = {
      'paid': 'Pagado',
      'sent': 'Enviado',
      'draft': 'Borrador',
      'overdue': 'Vencido',
      'cancelled': 'Cancelado',
      'completed': 'Completado',
      'pending': 'Pendiente',
      'failed': 'Fallido'
    };
    return texts[status] || status;
  }

  getPaymentMethodText(method) {
    const texts = {
      'credit_card': 'Tarjeta de Crédito',
      'debit_card': 'Tarjeta de Débito',
      'paypal': 'PayPal',
      'stripe': 'Stripe',
      'bank_transfer': 'Transferencia Bancaria',
      'cash': 'Efectivo'
    };
    return texts[method] || method;
  }

  // Update company info
  updateCompanyInfo(newInfo) {
    this.companyInfo = { ...this.companyInfo, ...newInfo };
  }

  // Generate subscription invoice
  async generateSubscriptionInvoice(subscriptionData, invoiceData) {
    const enhancedInvoiceData = {
      ...invoiceData,
      items: [{
        description: `Suscripción ${subscriptionData.planName} - ${subscriptionData.interval}`,
        quantity: 1,
        unitPrice: subscriptionData.amount,
        amount: subscriptionData.amount
      }],
      notes: `Suscripción válida desde ${new Date(subscriptionData.currentPeriodStart).toLocaleDateString('es-MX')} hasta ${new Date(subscriptionData.currentPeriodEnd).toLocaleDateString('es-MX')}`
    };

    return this.generateInvoice(enhancedInvoiceData);
  }
}

// Create singleton instance
const pdfGenerator = new PDFGenerator();

export default pdfGenerator;