import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initializeTransporter();
    this.setupTemplates();
  }

  initializeTransporter() {
    // Configure based on environment
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // For development, use ethereal email (testing service)
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      logger.warn('No SMTP configuration found. Using test mode.');
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    } else {
      this.transporter = nodemailer.createTransporter(emailConfig);
    }

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email service connection failed:', error);
      } else {
        logger.info('Email service ready');
      }
    });
  }

  setupTemplates() {
    // Base email template
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>{{subject}}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: #2563eb;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Mundoctor</h1>
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <p>© 2024 Mundoctor. Todos los derechos reservados.</p>
            <p>Este correo fue enviado automáticamente. No responder.</p>
          </div>
        </body>
      </html>
    `;

    // Appointment templates
    this.templates.set('appointment_created', {
      subject: 'Cita Programada - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Nueva Cita Programada</h2>
        <p>Hola {{patientName}},</p>
        <p>Se ha programado una nueva cita con los siguientes detalles:</p>
        <ul>
          <li><strong>Profesional:</strong> {{professionalName}}</li>
          <li><strong>Fecha:</strong> {{date}}</li>
          <li><strong>Hora:</strong> {{time}}</li>
          <li><strong>Servicio:</strong> {{service}}</li>
          <li><strong>Modalidad:</strong> {{modality}}</li>
        </ul>
        <p>{{message}}</p>
        <a href="{{appointmentUrl}}" class="button">Ver Detalles de la Cita</a>
        <p>Si necesitas cancelar o reprogramar, puedes hacerlo hasta 24 horas antes.</p>
      `)
    });

    this.templates.set('appointment_reminder', {
      subject: 'Recordatorio de Cita - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Recordatorio de Cita</h2>
        <p>Hola {{patientName}},</p>
        <p>Te recordamos que tienes una cita programada:</p>
        <ul>
          <li><strong>Profesional:</strong> {{professionalName}}</li>
          <li><strong>Fecha:</strong> {{date}}</li>
          <li><strong>Hora:</strong> {{time}}</li>
          <li><strong>Servicio:</strong> {{service}}</li>
          <li><strong>Modalidad:</strong> {{modality}}</li>
        </ul>
        <a href="{{appointmentUrl}}" class="button">Ver Detalles</a>
        <p>¡Te esperamos!</p>
      `)
    });

    this.templates.set('appointment_cancelled', {
      subject: 'Cita Cancelada - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Cita Cancelada</h2>
        <p>Hola {{patientName}},</p>
        <p>Tu cita del {{date}} a las {{time}} con {{professionalName}} ha sido cancelada.</p>
        <p><strong>Razón:</strong> {{reason}}</p>
        <a href="{{rescheduleUrl}}" class="button">Reagendar Cita</a>
        <p>Lamentamos las molestias ocasionadas.</p>
      `)
    });

    // Validation templates
    this.templates.set('validation_approved', {
      subject: 'Validación Aprobada - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>¡Validación Aprobada!</h2>
        <p>Hola {{professionalName}},</p>
        <p>¡Excelentes noticias! Tu validación como profesional de la salud ha sido aprobada.</p>
        <p>Ahora puedes:</p>
        <ul>
          <li>Crear y gestionar tus servicios</li>
          <li>Recibir citas de pacientes</li>
          <li>Acceder a todas las funcionalidades profesionales</li>
        </ul>
        <a href="{{dashboardUrl}}" class="button">Acceder al Dashboard</a>
        <p>¡Bienvenido al equipo de Mundoctor!</p>
      `)
    });

    this.templates.set('validation_rejected', {
      subject: 'Validación Rechazada - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Validación Rechazada</h2>
        <p>Hola {{professionalName}},</p>
        <p>Tu solicitud de validación ha sido rechazada por la siguiente razón:</p>
        <p><strong>{{reason}}</strong></p>
        <p>Puedes corregir la información y volver a solicitar la validación.</p>
        <a href="{{validationUrl}}" class="button">Corregir Información</a>
        <p>Si tienes preguntas, contacta con nuestro equipo de soporte.</p>
      `)
    });

    // Review templates
    this.templates.set('review_received', {
      subject: 'Nueva Reseña - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Nueva Reseña Recibida</h2>
        <p>Hola {{professionalName}},</p>
        <p>Has recibido una nueva reseña de {{patientName}}:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Calificación:</strong> {{rating}}/5 estrellas</p>
          <p><strong>Comentario:</strong> "{{comment}}"</p>
        </div>
        <a href="{{reviewUrl}}" class="button">Ver Reseña</a>
        <p>¡Sigue brindando un excelente servicio!</p>
      `)
    });

    // Subscription templates
    this.templates.set('subscription_expiring', {
      subject: 'Suscripción por Vencer - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Suscripción por Vencer</h2>
        <p>Hola {{professionalName}},</p>
        <p>Tu suscripción {{planName}} vence en {{days}} días ({{expirationDate}}).</p>
        <p>Para mantener acceso a todas las funcionalidades, renueva tu suscripción:</p>
        <a href="{{renewUrl}}" class="button">Renovar Suscripción</a>
        <p>Si tienes preguntas, contacta con nuestro equipo de soporte.</p>
      `)
    });

    // Ticket templates
    this.templates.set('ticket_created', {
      subject: 'Ticket de Soporte Creado - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Ticket de Soporte Creado</h2>
        <p>Hola {{userName}},</p>
        <p>Tu ticket de soporte ha sido creado exitosamente:</p>
        <ul>
          <li><strong>Número de Ticket:</strong> #{{ticketId}}</li>
          <li><strong>Categoría:</strong> {{category}}</li>
          <li><strong>Prioridad:</strong> {{priority}}</li>
          <li><strong>Asunto:</strong> {{subject}}</li>
        </ul>
        <a href="{{ticketUrl}}" class="button">Ver Ticket</a>
        <p>Nuestro equipo te contactará pronto.</p>
      `)
    });

    this.templates.set('ticket_resolved', {
      subject: 'Ticket Resuelto - Mundoctor',
      html: baseTemplate.replace('{{content}}', `
        <h2>Ticket Resuelto</h2>
        <p>Hola {{userName}},</p>
        <p>Tu ticket #{{ticketId}} ha sido resuelto.</p>
        <p><strong>Solución:</strong> {{solution}}</p>
        <a href="{{ticketUrl}}" class="button">Ver Detalles</a>
        <p>¿Quedaste satisfecho con la solución? <a href="{{feedbackUrl}}">Déjanos tu feedback</a></p>
      `)
    });

    logger.info('Email templates loaded');
  }

  async sendEmail({ to, subject, template, variables = {}, html, text }) {
    try {
      if (!to) {
        throw new Error('Recipient email is required');
      }

      let emailHtml = html;
      let emailSubject = subject;

      // Use template if provided
      if (template && this.templates.has(template)) {
        const templateData = this.templates.get(template);
        emailHtml = this.replaceVariables(templateData.html, variables);
        emailSubject = subject || templateData.subject;
      }

      const mailOptions = {
        from: `"Mundoctor" <${process.env.SMTP_FROM || 'noreply@mundoctor.com'}>`,
        to,
        subject: emailSubject,
        html: emailHtml,
        text: text || this.htmlToText(emailHtml)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${to}:`, result.messageId);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logger.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkEmail({ recipients, subject, template, variables = {}, html, text }) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const recipientVariables = { ...variables, ...recipient.variables };
        const result = await this.sendEmail({
          to: recipient.email,
          subject,
          template,
          variables: recipientVariables,
          html,
          text
        });
        results.push({ email: recipient.email, ...result });
      } catch (error) {
        logger.error(`Failed to send email to ${recipient.email}:`, error);
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }

    return results;
  }

  replaceVariables(template, variables) {
    if (!template || !variables) return template;
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  htmlToText(html) {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Test email configuration
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection test passed');
      return true;
    } catch (error) {
      logger.error('Email service connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export functions for easy use
export const sendEmail = emailService.sendEmail.bind(emailService);
export const sendBulkEmail = emailService.sendBulkEmail.bind(emailService);
export const testEmailConnection = emailService.testConnection.bind(emailService);

export default emailService;