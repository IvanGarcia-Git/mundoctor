import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // For development, use console logging instead of email
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      logger.warn('No SMTP configuration found. Using test mode.');
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    } else {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      this.transporter = nodemailer.createTransport(emailConfig);
    }

    // Verify connection only if not in test mode
    if (process.env.NODE_ENV !== 'development' || process.env.SMTP_USER) {
      this.transporter.verify((error) => {
        if (error) {
          logger.error('Email service connection failed:', error);
        } else {
          logger.info('Email service connected successfully');
        }
      });
    }

    logger.info('Email service initialized');
  }

  async sendEmail(to, subject, html, text) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@mundoctor.com',
        to,
        subject,
        html,
        text
      };

      if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
        logger.info('Email would be sent in production:', { to, subject });
        return { messageId: 'test-message-id' };
      }

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to, subject, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = '¡Bienvenido a Mundoctor!';
    const html = `
      <h1>¡Bienvenido a Mundoctor, ${user.name}!</h1>
      <p>Tu cuenta ha sido creada exitosamente.</p>
      <p>Email: ${user.email}</p>
      <p>Rol: ${user.role}</p>
    `;
    
    return this.sendEmail(user.email, subject, html);
  }

  async sendVerificationEmail(user, verificationCode) {
    const subject = 'Verifica tu cuenta - Mundoctor';
    const html = `
      <h1>Verifica tu cuenta</h1>
      <p>Hola ${user.name},</p>
      <p>Código de verificación: <strong>${verificationCode}</strong></p>
    `;
    
    return this.sendEmail(user.email, subject, html);
  }
}

export default new EmailService();