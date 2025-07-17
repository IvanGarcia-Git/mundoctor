import cron from 'node-cron';
import logger from '../utils/logger.js';
import notificationService, { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } from '../services/notificationService.js';
import { query } from '../config/database.js';
import { createAuditLog } from '../utils/auditLog.js';

// const logger is already imported

class ReminderJobsService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Reminder jobs already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting reminder jobs...');

    // Daily appointment reminders (runs every day at 9 AM)
    this.jobs.set('appointment_reminders', cron.schedule('0 9 * * *', () => {
      this.sendAppointmentReminders();
    }, { scheduled: false }));

    // Subscription expiry reminders (runs every day at 10 AM)
    this.jobs.set('subscription_reminders', cron.schedule('0 10 * * *', () => {
      this.sendSubscriptionReminders();
    }, { scheduled: false }));

    // Validation follow-up reminders (runs every Monday at 11 AM)
    this.jobs.set('validation_reminders', cron.schedule('0 11 * * 1', () => {
      this.sendValidationReminders();
    }, { scheduled: false }));

    // Auto-close resolved tickets (runs every day at midnight)
    this.jobs.set('auto_close_tickets', cron.schedule('0 0 * * *', () => {
      this.autoCloseResolvedTickets();
    }, { scheduled: false }));

    // Escalate high-priority tickets (runs every 2 hours)
    this.jobs.set('escalate_tickets', cron.schedule('0 */2 * * *', () => {
      this.escalateHighPriorityTickets();
    }, { scheduled: false }));

    // Clean up old notifications (runs every Sunday at 2 AM)
    this.jobs.set('cleanup_notifications', cron.schedule('0 2 * * 0', () => {
      this.cleanupOldNotifications();
    }, { scheduled: false }));

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`Started job: ${name}`);
    });

    logger.info('All reminder jobs started successfully');
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Reminder jobs not running');
      return;
    }

    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });

    this.isRunning = false;
    logger.info('All reminder jobs stopped');
  }

  async sendAppointmentReminders() {
    try {
      logger.info('Running appointment reminders job...');

      // Get appointments for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const appointmentsQuery = `
        SELECT 
          a.id,
          a.patient_id,
          a.professional_id,
          a.date,
          a.time,
          a.service_name,
          a.modality,
          a.status,
          p.email as patient_email,
          p.phone as patient_phone,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          pr.email as professional_email,
          pr.first_name as professional_first_name,
          pr.last_name as professional_last_name
        FROM appointments a
        JOIN users p ON a.patient_id = p.clerk_id
        JOIN users pr ON a.professional_id = pr.clerk_id
        WHERE a.date = $1 
          AND a.status = 'confirmed'
          AND a.reminder_sent = false
      `;

      const appointments = await query(appointmentsQuery, [tomorrowStr]);
      logger.info(`Found ${appointments.rows.length} appointments for tomorrow`);

      for (const appointment of appointments.rows) {
        try {
          // Send reminder to patient
          await notificationService.sendNotification({
            userId: appointment.patient_id,
            type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
            channels: [NOTIFICATION_CHANNELS.WEBSOCKET, NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.SMS],
            variables: {
              patientName: `${appointment.patient_first_name} ${appointment.patient_last_name}`,
              professionalName: `${appointment.professional_first_name} ${appointment.professional_last_name}`,
              date: new Date(appointment.date).toLocaleDateString('es-MX'),
              time: appointment.time,
              service: appointment.service_name,
              modality: appointment.modality === 'online' ? 'Virtual' : 'Presencial',
              appointmentUrl: `${process.env.FRONTEND_URL}/patient/appointments/${appointment.id}`
            },
            data: {
              email: appointment.patient_email,
              phone: appointment.patient_phone,
              appointmentId: appointment.id
            }
          });

          // Send reminder to professional
          await notificationService.sendNotification({
            userId: appointment.professional_id,
            type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
            channels: [NOTIFICATION_CHANNELS.WEBSOCKET, NOTIFICATION_CHANNELS.EMAIL],
            variables: {
              professionalName: `${appointment.professional_first_name} ${appointment.professional_last_name}`,
              patientName: `${appointment.patient_first_name} ${appointment.patient_last_name}`,
              date: new Date(appointment.date).toLocaleDateString('es-MX'),
              time: appointment.time,
              service: appointment.service_name,
              modality: appointment.modality === 'online' ? 'Virtual' : 'Presencial',
              appointmentUrl: `${process.env.FRONTEND_URL}/professional/appointments/${appointment.id}`
            },
            data: {
              email: appointment.professional_email,
              appointmentId: appointment.id
            }
          });

          // Mark reminder as sent
          await query(
            'UPDATE appointments SET reminder_sent = true WHERE id = $1',
            [appointment.id]
          );

          logger.info(`Sent reminder for appointment ${appointment.id}`);

        } catch (error) {
          logger.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
        }
      }

      // Audit log
      await createAuditLog({
        userId: 'system',
        action: 'appointment_reminders_sent',
        resource: 'appointments',
        details: { count: appointments.rows.length }
      });

      logger.info(`Appointment reminders job completed. Sent ${appointments.rows.length} reminders.`);

    } catch (error) {
      logger.error('Error in appointment reminders job:', error);
    }
  }

  async sendSubscriptionReminders() {
    try {
      logger.info('Running subscription reminders job...');

      // Get subscriptions expiring in 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const subscriptionsQuery = `
        SELECT 
          s.id,
          s.user_id,
          s.plan_name,
          s.expires_at,
          s.status,
          u.email,
          u.first_name,
          u.last_name
        FROM subscriptions s
        JOIN users u ON s.user_id = u.clerk_id
        WHERE s.expires_at::date = $1
          AND s.status = 'active'
          AND s.reminder_sent = false
      `;

      const subscriptions = await query(subscriptionsQuery, [sevenDaysFromNow.toISOString().split('T')[0]]);
      logger.info(`Found ${subscriptions.rows.length} subscriptions expiring in 7 days`);

      for (const subscription of subscriptions.rows) {
        try {
          await notificationService.sendNotification({
            userId: subscription.user_id,
            type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
            channels: [NOTIFICATION_CHANNELS.WEBSOCKET, NOTIFICATION_CHANNELS.EMAIL],
            variables: {
              professionalName: `${subscription.first_name} ${subscription.last_name}`,
              planName: subscription.plan_name,
              days: '7',
              expirationDate: new Date(subscription.expires_at).toLocaleDateString('es-MX'),
              renewUrl: `${process.env.FRONTEND_URL}/professional/subscription`
            },
            data: {
              email: subscription.email,
              subscriptionId: subscription.id
            }
          });

          // Mark reminder as sent
          await query(
            'UPDATE subscriptions SET reminder_sent = true WHERE id = $1',
            [subscription.id]
          );

          logger.info(`Sent subscription reminder for user ${subscription.user_id}`);

        } catch (error) {
          logger.error(`Failed to send subscription reminder for user ${subscription.user_id}:`, error);
        }
      }

      // Audit log
      await createAuditLog({
        userId: 'system',
        action: 'subscription_reminders_sent',
        resource: 'subscriptions',
        details: { count: subscriptions.rows.length }
      });

      logger.info(`Subscription reminders job completed. Sent ${subscriptions.rows.length} reminders.`);

    } catch (error) {
      logger.error('Error in subscription reminders job:', error);
    }
  }

  async sendValidationReminders() {
    try {
      logger.info('Running validation reminders job...');

      // Get validations pending for more than 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const validationsQuery = `
        SELECT 
          v.id,
          v.user_id,
          v.status,
          v.created_at,
          u.email,
          u.first_name,
          u.last_name
        FROM professional_validations v
        JOIN users u ON v.user_id = u.clerk_id
        WHERE v.created_at < $1
          AND v.status = 'pending'
          AND v.reminder_sent = false
      `;

      const validations = await query(validationsQuery, [threeDaysAgo.toISOString()]);
      logger.info(`Found ${validations.rows.length} validations pending for more than 3 days`);

      for (const validation of validations.rows) {
        try {
          // Send reminder to admins
          await notificationService.sendRoleNotification({
            role: 'admin',
            type: NOTIFICATION_TYPES.VALIDATION_SUBMITTED,
            variables: {
              professionalName: `${validation.first_name} ${validation.last_name}`,
              days: Math.ceil((new Date() - new Date(validation.created_at)) / (1000 * 60 * 60 * 24)),
              validationUrl: `${process.env.FRONTEND_URL}/admin/validation/${validation.id}`
            },
            data: {
              validationId: validation.id
            }
          });

          // Mark reminder as sent
          await query(
            'UPDATE professional_validations SET reminder_sent = true WHERE id = $1',
            [validation.id]
          );

          logger.info(`Sent validation reminder for validation ${validation.id}`);

        } catch (error) {
          logger.error(`Failed to send validation reminder for validation ${validation.id}:`, error);
        }
      }

      // Audit log
      await createAuditLog({
        userId: 'system',
        action: 'validation_reminders_sent',
        resource: 'validations',
        details: { count: validations.rows.length }
      });

      logger.info(`Validation reminders job completed. Sent ${validations.rows.length} reminders.`);

    } catch (error) {
      logger.error('Error in validation reminders job:', error);
    }
  }

  async autoCloseResolvedTickets() {
    try {
      logger.info('Running auto-close resolved tickets job...');

      // Auto-close tickets that have been resolved for more than 48 hours
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

      const ticketsQuery = `
        SELECT 
          t.id,
          t.user_id,
          t.subject,
          t.updated_at,
          u.email,
          u.first_name,
          u.last_name
        FROM tickets t
        JOIN users u ON t.user_id = u.clerk_id
        WHERE t.status = 'resolved'
          AND t.updated_at < $1
      `;

      const tickets = await query(ticketsQuery, [twoDaysAgo.toISOString()]);
      logger.info(`Found ${tickets.rows.length} resolved tickets to auto-close`);

      for (const ticket of tickets.rows) {
        try {
          // Close the ticket
          await query(
            'UPDATE tickets SET status = $1, updated_at = $2 WHERE id = $3',
            ['closed', new Date().toISOString(), ticket.id]
          );

          // Send notification
          await notificationService.sendNotification({
            userId: ticket.user_id,
            type: NOTIFICATION_TYPES.TICKET_RESOLVED,
            channels: [NOTIFICATION_CHANNELS.WEBSOCKET, NOTIFICATION_CHANNELS.EMAIL],
            variables: {
              userName: `${ticket.first_name} ${ticket.last_name}`,
              ticketId: ticket.id,
              subject: ticket.subject,
              ticketUrl: `${process.env.FRONTEND_URL}/tickets/${ticket.id}`,
              feedbackUrl: `${process.env.FRONTEND_URL}/tickets/${ticket.id}/feedback`
            },
            data: {
              email: ticket.email,
              ticketId: ticket.id
            }
          });

          logger.info(`Auto-closed ticket ${ticket.id}`);

        } catch (error) {
          logger.error(`Failed to auto-close ticket ${ticket.id}:`, error);
        }
      }

      // Audit log
      await createAuditLog({
        userId: 'system',
        action: 'tickets_auto_closed',
        resource: 'tickets',
        details: { count: tickets.rows.length }
      });

      logger.info(`Auto-close tickets job completed. Closed ${tickets.rows.length} tickets.`);

    } catch (error) {
      logger.error('Error in auto-close tickets job:', error);
    }
  }

  async escalateHighPriorityTickets() {
    try {
      logger.info('Running escalate high-priority tickets job...');

      // Escalate urgent tickets older than 2 hours
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const urgentTicketsQuery = `
        SELECT 
          t.id,
          t.user_id,
          t.subject,
          t.priority,
          t.created_at,
          u.email,
          u.first_name,
          u.last_name
        FROM tickets t
        JOIN users u ON t.user_id = u.clerk_id
        WHERE t.priority = 'urgent'
          AND t.status IN ('open', 'assigned')
          AND t.created_at < $1
          AND t.escalated = false
      `;

      const urgentTickets = await query(urgentTicketsQuery, [twoHoursAgo.toISOString()]);
      logger.info(`Found ${urgentTickets.rows.length} urgent tickets to escalate`);

      for (const ticket of urgentTickets.rows) {
        try {
          // Mark as escalated
          await query(
            'UPDATE tickets SET escalated = true, updated_at = $1 WHERE id = $2',
            [new Date().toISOString(), ticket.id]
          );

          // Send escalation notification to admins
          await notificationService.sendRoleNotification({
            role: 'admin',
            type: NOTIFICATION_TYPES.TICKET_CREATED,
            title: 'Ticket Urgente Escalado',
            variables: {
              userName: `${ticket.first_name} ${ticket.last_name}`,
              ticketId: ticket.id,
              subject: ticket.subject,
              priority: ticket.priority,
              hoursOpen: Math.ceil((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60)),
              ticketUrl: `${process.env.FRONTEND_URL}/admin/tickets/${ticket.id}`
            },
            data: {
              ticketId: ticket.id
            }
          });

          logger.info(`Escalated urgent ticket ${ticket.id}`);

        } catch (error) {
          logger.error(`Failed to escalate ticket ${ticket.id}:`, error);
        }
      }

      // Audit log
      await createAuditLog({
        userId: 'system',
        action: 'tickets_escalated',
        resource: 'tickets',
        details: { count: urgentTickets.rows.length }
      });

      logger.info(`Escalate tickets job completed. Escalated ${urgentTickets.rows.length} tickets.`);

    } catch (error) {
      logger.error('Error in escalate tickets job:', error);
    }
  }

  async cleanupOldNotifications() {
    try {
      logger.info('Running cleanup old notifications job...');

      // This would clean up notifications from a notifications table if we had one
      // For now, we'll just log that the cleanup ran
      
      logger.info('Cleanup old notifications job completed (placeholder).');

    } catch (error) {
      logger.error('Error in cleanup notifications job:', error);
    }
  }

  // Manual trigger methods for testing
  async triggerAppointmentReminders() {
    logger.info('Manually triggering appointment reminders...');
    await this.sendAppointmentReminders();
  }

  async triggerSubscriptionReminders() {
    logger.info('Manually triggering subscription reminders...');
    await this.sendSubscriptionReminders();
  }

  async triggerValidationReminders() {
    logger.info('Manually triggering validation reminders...');
    await this.sendValidationReminders();
  }

  // Get job status
  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });
    return {
      isRunning: this.isRunning,
      jobs: status
    };
  }
}

// Create singleton instance
const reminderJobsService = new ReminderJobsService();

export default reminderJobsService;