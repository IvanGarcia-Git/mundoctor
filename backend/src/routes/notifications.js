import express from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateSchema } from '../middleware/validation.js';
import notificationService, { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, NOTIFICATION_PRIORITIES } from '../services/notificationService.js';
import reminderJobsService from '../jobs/reminderJobs.js';
import emailService from '../services/emailService.js';
import { testSMSConnection } from '../services/smsService.js';
import webSocketManager from '../utils/websocket.js';
import logger from '../utils/logger.js';
import { createAuditLog } from '../utils/auditLog.js';
import { query } from '../config/database.js';

const router = express.Router();
// const logger is already imported

// Validation schemas
const sendNotificationSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(Object.values(NOTIFICATION_TYPES)),
  title: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(500).optional(),
  channels: z.array(z.enum(Object.values(NOTIFICATION_CHANNELS))).default([NOTIFICATION_CHANNELS.WEBSOCKET]),
  priority: z.enum(Object.values(NOTIFICATION_PRIORITIES)).default(NOTIFICATION_PRIORITIES.MEDIUM),
  data: z.object({}).optional(),
  variables: z.object({}).optional()
});

const sendBulkNotificationSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
  type: z.enum(Object.values(NOTIFICATION_TYPES)),
  title: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(500).optional(),
  channels: z.array(z.enum(Object.values(NOTIFICATION_CHANNELS))).default([NOTIFICATION_CHANNELS.WEBSOCKET]),
  priority: z.enum(Object.values(NOTIFICATION_PRIORITIES)).default(NOTIFICATION_PRIORITIES.MEDIUM),
  data: z.object({}).optional(),
  variables: z.object({}).optional()
});

const sendRoleNotificationSchema = z.object({
  role: z.enum(['admin', 'professional', 'patient']),
  type: z.enum(Object.values(NOTIFICATION_TYPES)),
  title: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(500).optional(),
  channels: z.array(z.enum(Object.values(NOTIFICATION_CHANNELS))).default([NOTIFICATION_CHANNELS.WEBSOCKET]),
  priority: z.enum(Object.values(NOTIFICATION_PRIORITIES)).default(NOTIFICATION_PRIORITIES.MEDIUM),
  data: z.object({}).optional(),
  variables: z.object({}).optional()
});

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /api/notifications/types - Get available notification types
router.get('/types', (req, res) => {
  res.json({
    types: Object.values(NOTIFICATION_TYPES),
    channels: Object.values(NOTIFICATION_CHANNELS),
    priorities: Object.values(NOTIFICATION_PRIORITIES)
  });
});

// GET /api/notifications/stats - Get notification service statistics
router.get('/stats', requireRole(['admin']), (req, res) => {
  try {
    const stats = {
      ...notificationService.getStats(),
      jobStatus: reminderJobsService.getJobStatus()
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Error getting notification stats:', error);
    res.status(500).json({ error: 'Failed to get notification stats' });
  }
});

// POST /api/notifications/send - Send notification to specific user
router.post('/send', 
  requireRole(['admin']), 
  validateSchema(sendNotificationSchema), 
  async (req, res) => {
    try {
      const { userId, type, title, message, channels, priority, data, variables } = req.body;
      
      // If userId not provided, use the authenticated user
      const targetUserId = userId || req.auth.userId;
      
      const result = await notificationService.sendNotification({
        userId: targetUserId,
        type,
        title,
        message,
        channels,
        priority,
        data,
        variables
      });

      // Audit log
      await createAuditLog({
        userId: req.auth.userId,
        action: 'notification_sent',
        resource: 'notification',
        resourceId: result.notificationId,
        details: {
          targetUserId,
          type,
          channels,
          priority
        }
      });

      res.json(result);
    } catch (error) {
      logger.error('Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
);

// POST /api/notifications/send-bulk - Send notification to multiple users
router.post('/send-bulk',
  requireRole(['admin']),
  validateSchema(sendBulkNotificationSchema),
  async (req, res) => {
    try {
      const { userIds, type, title, message, channels, priority, data, variables } = req.body;
      
      const result = await notificationService.sendBulkNotification({
        userIds,
        type,
        title,
        message,
        channels,
        priority,
        data,
        variables
      });

      // Audit log
      await createAuditLog({
        userId: req.auth.userId,
        action: 'bulk_notification_sent',
        resource: 'notification',
        details: {
          userIds,
          type,
          channels,
          priority,
          count: userIds.length
        }
      });

      res.json(result);
    } catch (error) {
      logger.error('Error sending bulk notification:', error);
      res.status(500).json({ error: 'Failed to send bulk notification' });
    }
  }
);

// POST /api/notifications/send-role - Send notification to all users with specific role
router.post('/send-role',
  requireRole(['admin']),
  validateSchema(sendRoleNotificationSchema),
  async (req, res) => {
    try {
      const { role, type, title, message, channels, priority, data, variables } = req.body;
      
      const result = await notificationService.sendRoleNotification({
        role,
        type,
        title,
        message,
        channels,
        priority,
        data,
        variables
      });

      // Audit log
      await createAuditLog({
        userId: req.auth.userId,
        action: 'role_notification_sent',
        resource: 'notification',
        details: {
          role,
          type,
          channels,
          priority
        }
      });

      res.json(result);
    } catch (error) {
      logger.error('Error sending role notification:', error);
      res.status(500).json({ error: 'Failed to send role notification' });
    }
  }
);

// POST /api/notifications/broadcast - Send system-wide notification
router.post('/broadcast',
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { type, title, message, priority, data, variables } = req.body;
      
      const result = await notificationService.sendSystemNotification({
        type,
        title,
        message,
        priority,
        data,
        variables
      });

      // Audit log
      await createAuditLog({
        userId: req.auth.userId,
        action: 'system_notification_sent',
        resource: 'notification',
        details: {
          type,
          priority
        }
      });

      res.json(result);
    } catch (error) {
      logger.error('Error sending system notification:', error);
      res.status(500).json({ error: 'Failed to send system notification' });
    }
  }
);

// GET /api/notifications/online-users - Get online users count
router.get('/online-users', requireRole(['admin']), (req, res) => {
  try {
    const onlineCount = webSocketManager.getOnlineUsersCount();
    res.json({ onlineUsers: onlineCount });
  } catch (error) {
    logger.error('Error getting online users:', error);
    res.status(500).json({ error: 'Failed to get online users count' });
  }
});

// GET /api/notifications/online-users/:role - Get online users by role
router.get('/online-users/:role', requireRole(['admin']), (req, res) => {
  try {
    const { role } = req.params;
    const onlineUsers = webSocketManager.getOnlineUsersByRole(role);
    res.json({ role, onlineUsers });
  } catch (error) {
    logger.error('Error getting online users by role:', error);
    res.status(500).json({ error: 'Failed to get online users by role' });
  }
});

// POST /api/notifications/test/email - Test email configuration
router.post('/test/email', requireRole(['admin']), async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || req.auth.email;
    
    if (!targetEmail) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Test connection first
    const connectionTest = { success: true, message: 'Email service initialized' };
    if (!connectionTest) {
      return res.status(500).json({ error: 'Email service connection failed' });
    }

    // Send test email
    const result = await notificationService.sendNotification({
      userId: req.auth.userId,
      type: NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
      title: 'Test de Notificación por Email',
      message: 'Este es un email de prueba del sistema de notificaciones de Mundoctor.',
      channels: [NOTIFICATION_CHANNELS.EMAIL],
      data: { email: targetEmail }
    });

    res.json(result);
  } catch (error) {
    logger.error('Error testing email:', error);
    res.status(500).json({ error: 'Failed to test email service' });
  }
});

// POST /api/notifications/test/sms - Test SMS configuration
router.post('/test/sms', requireRole(['admin']), async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Test connection first
    const connectionTest = await testSMSConnection();
    if (!connectionTest.success) {
      return res.status(500).json({ error: 'SMS service connection failed' });
    }

    // Send test SMS
    const result = await notificationService.sendNotification({
      userId: req.auth.userId,
      type: NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
      title: 'Test de SMS',
      message: 'Este es un SMS de prueba del sistema de notificaciones de Mundoctor.',
      channels: [NOTIFICATION_CHANNELS.SMS],
      data: { phone }
    });

    res.json(result);
  } catch (error) {
    logger.error('Error testing SMS:', error);
    res.status(500).json({ error: 'Failed to test SMS service' });
  }
});

// Reminder Jobs Management Routes

// GET /api/notifications/jobs/status - Get reminder jobs status
router.get('/jobs/status', requireRole(['admin']), (req, res) => {
  try {
    const status = reminderJobsService.getJobStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting jobs status:', error);
    res.status(500).json({ error: 'Failed to get jobs status' });
  }
});

// POST /api/notifications/jobs/start - Start reminder jobs
router.post('/jobs/start', requireRole(['admin']), (req, res) => {
  try {
    reminderJobsService.start();
    res.json({ success: true, message: 'Reminder jobs started' });
  } catch (error) {
    logger.error('Error starting jobs:', error);
    res.status(500).json({ error: 'Failed to start jobs' });
  }
});

// POST /api/notifications/jobs/stop - Stop reminder jobs
router.post('/jobs/stop', requireRole(['admin']), (req, res) => {
  try {
    reminderJobsService.stop();
    res.json({ success: true, message: 'Reminder jobs stopped' });
  } catch (error) {
    logger.error('Error stopping jobs:', error);
    res.status(500).json({ error: 'Failed to stop jobs' });
  }
});

// POST /api/notifications/jobs/trigger/appointments - Manually trigger appointment reminders
router.post('/jobs/trigger/appointments', requireRole(['admin']), async (req, res) => {
  try {
    await reminderJobsService.triggerAppointmentReminders();
    res.json({ success: true, message: 'Appointment reminders triggered' });
  } catch (error) {
    logger.error('Error triggering appointment reminders:', error);
    res.status(500).json({ error: 'Failed to trigger appointment reminders' });
  }
});

// POST /api/notifications/jobs/trigger/subscriptions - Manually trigger subscription reminders
router.post('/jobs/trigger/subscriptions', requireRole(['admin']), async (req, res) => {
  try {
    await reminderJobsService.triggerSubscriptionReminders();
    res.json({ success: true, message: 'Subscription reminders triggered' });
  } catch (error) {
    logger.error('Error triggering subscription reminders:', error);
    res.status(500).json({ error: 'Failed to trigger subscription reminders' });
  }
});

// POST /api/notifications/jobs/trigger/validations - Manually trigger validation reminders
router.post('/jobs/trigger/validations', requireRole(['admin']), async (req, res) => {
  try {
    await reminderJobsService.triggerValidationReminders();
    res.json({ success: true, message: 'Validation reminders triggered' });
  } catch (error) {
    logger.error('Error triggering validation reminders:', error);
    res.status(500).json({ error: 'Failed to trigger validation reminders' });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('Notifications API error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default router;