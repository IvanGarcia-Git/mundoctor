import logger from '../utils/logger.js';
import webSocketManager from '../utils/websocket.js';
import emailService from './emailService.js';
import { sendSMS } from './smsService.js';
import { createAuditLog } from '../utils/auditLog.js';

// const logger is already imported

// Notification types
export const NOTIFICATION_TYPES = {
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  VALIDATION_SUBMITTED: 'validation_submitted',
  VALIDATION_APPROVED: 'validation_approved',
  VALIDATION_REJECTED: 'validation_rejected',
  VALIDATION_INFO_REQUESTED: 'validation_info_requested',
  REVIEW_RECEIVED: 'review_received',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  TICKET_CREATED: 'ticket_created',
  TICKET_UPDATED: 'ticket_updated',
  TICKET_RESOLVED: 'ticket_resolved',
  PROFESSIONAL_AVAILABLE: 'professional_available',
  PATIENT_MESSAGE: 'patient_message',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  PAYMENT_SUCCESSFUL: 'payment_successful',
  PAYMENT_FAILED: 'payment_failed'
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Notification channels
export const NOTIFICATION_CHANNELS = {
  WEBSOCKET: 'websocket',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
};

class NotificationService {
  constructor() {
    this.templates = new Map();
    this.userPreferences = new Map();
    this.setupTemplates();
  }

  setupTemplates() {
    // Appointment templates
    this.templates.set(NOTIFICATION_TYPES.APPOINTMENT_CREATED, {
      title: 'Nueva Cita Programada',
      message: 'Se ha programado una nueva cita para el {{date}} a las {{time}}',
      emailSubject: 'Cita Programada - Mundoctor',
      emailTemplate: 'appointment_created',
      smsTemplate: 'Nueva cita: {{date}} {{time}}. Consulta los detalles en Mundoctor.'
    });

    this.templates.set(NOTIFICATION_TYPES.APPOINTMENT_REMINDER, {
      title: 'Recordatorio de Cita',
      message: 'Recordatorio: Tienes una cita mañana a las {{time}} con {{professional}}',
      emailSubject: 'Recordatorio de Cita - Mundoctor',
      emailTemplate: 'appointment_reminder',
      smsTemplate: 'Recordatorio: Cita mañana {{time}} con {{professional}}. Mundoctor'
    });

    this.templates.set(NOTIFICATION_TYPES.APPOINTMENT_CANCELLED, {
      title: 'Cita Cancelada',
      message: 'Tu cita del {{date}} ha sido cancelada',
      emailSubject: 'Cita Cancelada - Mundoctor',
      emailTemplate: 'appointment_cancelled',
      smsTemplate: 'Cita cancelada: {{date}}. Reagenda en Mundoctor.'
    });

    // Validation templates
    this.templates.set(NOTIFICATION_TYPES.VALIDATION_APPROVED, {
      title: 'Validación Aprobada',
      message: '¡Felicidades! Tu validación como profesional ha sido aprobada',
      emailSubject: 'Validación Aprobada - Mundoctor',
      emailTemplate: 'validation_approved',
      smsTemplate: '¡Validación aprobada! Ya puedes usar todos los servicios de Mundoctor.'
    });

    this.templates.set(NOTIFICATION_TYPES.VALIDATION_REJECTED, {
      title: 'Validación Rechazada',
      message: 'Tu solicitud de validación ha sido rechazada. Revisa los comentarios.',
      emailSubject: 'Validación Rechazada - Mundoctor',
      emailTemplate: 'validation_rejected',
      smsTemplate: 'Validación rechazada. Revisa los comentarios en Mundoctor.'
    });

    // Review templates
    this.templates.set(NOTIFICATION_TYPES.REVIEW_RECEIVED, {
      title: 'Nueva Reseña',
      message: 'Has recibido una nueva reseña de {{patient}}',
      emailSubject: 'Nueva Reseña - Mundoctor',
      emailTemplate: 'review_received',
      smsTemplate: 'Nueva reseña recibida. Revísala en Mundoctor.'
    });

    // Subscription templates
    this.templates.set(NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING, {
      title: 'Suscripción por Vencer',
      message: 'Tu suscripción vence en {{days}} días',
      emailSubject: 'Suscripción por Vencer - Mundoctor',
      emailTemplate: 'subscription_expiring',
      smsTemplate: 'Tu suscripción vence en {{days}} días. Renueva en Mundoctor.'
    });

    // Ticket templates
    this.templates.set(NOTIFICATION_TYPES.TICKET_CREATED, {
      title: 'Ticket Creado',
      message: 'Tu ticket de soporte #{{ticketId}} ha sido creado',
      emailSubject: 'Ticket de Soporte Creado - Mundoctor',
      emailTemplate: 'ticket_created',
      smsTemplate: 'Ticket #{{ticketId}} creado. Te contactaremos pronto.'
    });

    this.templates.set(NOTIFICATION_TYPES.TICKET_RESOLVED, {
      title: 'Ticket Resuelto',
      message: 'Tu ticket #{{ticketId}} ha sido resuelto',
      emailSubject: 'Ticket Resuelto - Mundoctor',
      emailTemplate: 'ticket_resolved',
      smsTemplate: 'Ticket #{{ticketId}} resuelto. ¡Gracias por usar Mundoctor!'
    });
  }

  // Replace template variables
  replaceTemplateVariables(template, variables) {
    if (!template || !variables) return template;
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  // Send notification through multiple channels
  async sendNotification({
    userId,
    type,
    title,
    message,
    data = {},
    channels = [NOTIFICATION_CHANNELS.WEBSOCKET],
    priority = NOTIFICATION_PRIORITIES.MEDIUM,
    userRole = null,
    variables = {}
  }) {
    try {
      logger.info(`Sending notification to user ${userId}: ${type}`);

      // Get template if type is provided
      const template = this.templates.get(type);
      
      // Use template or provided content
      const notificationTitle = title || (template ? this.replaceTemplateVariables(template.title, variables) : 'Notificación');
      const notificationMessage = message || (template ? this.replaceTemplateVariables(template.message, variables) : '');

      const notificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        title: notificationTitle,
        message: notificationMessage,
        data,
        priority,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Send through requested channels
      const results = {
        websocket: false,
        email: false,
        sms: false,
        push: false
      };

      // WebSocket notification
      if (channels.includes(NOTIFICATION_CHANNELS.WEBSOCKET)) {
        results.websocket = webSocketManager.sendToUser(userId, 'notification', notificationData);
      }

      // Email notification
      if (channels.includes(NOTIFICATION_CHANNELS.EMAIL) && template?.emailTemplate) {
        try {
          const emailSubject = this.replaceTemplateVariables(template.emailSubject, variables);
          const emailContent = this.replaceTemplateVariables(template.message, variables);
          
          results.email = await emailService.sendEmail(
            data.email,
            emailSubject,
            emailContent,
            emailContent
          );
        } catch (error) {
          logger.error('Email notification failed:', error);
        }
      }

      // SMS notification
      if (channels.includes(NOTIFICATION_CHANNELS.SMS) && template?.smsTemplate) {
        try {
          const smsContent = this.replaceTemplateVariables(template.smsTemplate, variables);
          
          results.sms = await sendSMS({
            to: data.phone,
            message: smsContent
          });
        } catch (error) {
          logger.error('SMS notification failed:', error);
        }
      }

      // Store notification in database (optional - for notification history)
      // await this.storeNotification(notificationData);

      // Audit log
      await createAuditLog({
        userId,
        action: 'notification_sent',
        resource: 'notification',
        resourceId: notificationData.id,
        details: {
          type,
          channels,
          priority,
          results
        }
      });

      logger.info(`Notification sent successfully to user ${userId}:`, results);
      return { success: true, notificationId: notificationData.id, results };

    } catch (error) {
      logger.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to multiple users
  async sendBulkNotification({
    userIds,
    type,
    title,
    message,
    data = {},
    channels = [NOTIFICATION_CHANNELS.WEBSOCKET],
    priority = NOTIFICATION_PRIORITIES.MEDIUM,
    variables = {}
  }) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendNotification({
          userId,
          type,
          title,
          message,
          data,
          channels,
          priority,
          variables
        });
        results.push({ userId, ...result });
      } catch (error) {
        logger.error(`Failed to send notification to user ${userId}:`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  // Send notification to role
  async sendRoleNotification({
    role,
    type,
    title,
    message,
    data = {},
    channels = [NOTIFICATION_CHANNELS.WEBSOCKET],
    priority = NOTIFICATION_PRIORITIES.MEDIUM,
    variables = {}
  }) {
    try {
      logger.info(`Sending notification to role ${role}: ${type}`);

      const template = this.templates.get(type);
      const notificationTitle = title || (template ? this.replaceTemplateVariables(template.title, variables) : 'Notificación');
      const notificationMessage = message || (template ? this.replaceTemplateVariables(template.message, variables) : '');

      const notificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: notificationTitle,
        message: notificationMessage,
        data,
        priority,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Send through WebSocket to all users with the role
      if (channels.includes(NOTIFICATION_CHANNELS.WEBSOCKET)) {
        webSocketManager.sendToRole(role, 'notification', notificationData);
      }

      logger.info(`Role notification sent successfully to ${role}`);
      return { success: true, notificationId: notificationData.id };

    } catch (error) {
      logger.error('Error sending role notification:', error);
      return { success: false, error: error.message };
    }
  }

  // System-wide broadcast
  async sendSystemNotification({
    type,
    title,
    message,
    data = {},
    priority = NOTIFICATION_PRIORITIES.HIGH,
    variables = {}
  }) {
    try {
      logger.info(`Sending system notification: ${type}`);

      const template = this.templates.get(type);
      const notificationTitle = title || (template ? this.replaceTemplateVariables(template.title, variables) : 'Notificación del Sistema');
      const notificationMessage = message || (template ? this.replaceTemplateVariables(template.message, variables) : '');

      const notificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: notificationTitle,
        message: notificationMessage,
        data,
        priority,
        timestamp: new Date().toISOString(),
        read: false,
        system: true
      };

      webSocketManager.broadcast('system_notification', notificationData);

      logger.info('System notification sent successfully');
      return { success: true, notificationId: notificationData.id };

    } catch (error) {
      logger.error('Error sending system notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification statistics
  getStats() {
    return {
      onlineUsers: webSocketManager.getOnlineUsersCount(),
      templates: this.templates.size,
      lastNotification: new Date().toISOString()
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;