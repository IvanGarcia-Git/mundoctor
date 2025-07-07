import express from 'express';
import adminService from '../services/adminService.js';
import statsService from '../services/statsService.js';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import {
  validateUserFilters,
  validateUserUpdate,
  validateUserSuspension,
  validateUserId,
  validateStatsFilters,
  validateSubscriptionFilters,
  validateCreateSubscription,
  validateUpdateSubscription,
  validateSystemSetting,
  validateAdminActionFilters,
  requireAdminRole,
  requireSuperAdminRole,
  preventSelfModification,
  validateCriticalOperation
} from '../validators/adminValidator.js';
import { createAuditLog } from '../utils/auditLog.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responses.js';

const router = express.Router();

// Middleware para autenticación y autorización de administrador
router.use(requireAuth);
router.use(requireAdminRole);

// ===== GESTIÓN DE USUARIOS =====

// GET /api/admin/users - Listar usuarios con filtros
router.get('/users', validateUserFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { role, status, search, dateFrom, dateTo, limit, offset, sortBy, sortOrder } = req.query;
    
    const filters = {
      role,
      status,
      search,
      dateFrom,
      dateTo
    };
    
    const pagination = {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'DESC'
    };
    
    const results = await adminService.getUsers(filters, pagination);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_users_accessed',
      resource: 'admin',
      details: { 
        filters,
        resultsCount: results.users.length
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, results, 'Usuarios obtenidos correctamente');
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/admin/users/:id - Obtener usuario específico
router.get('/users/:id', validateUserId, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    
    const user = await adminService.getUserById(id);
    
    if (!user) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_user_accessed',
      resource: 'admin',
      resourceId: id,
      details: { targetUserId: id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, user, 'Usuario obtenido correctamente');
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// PUT /api/admin/users/:id - Actualizar usuario
router.put('/users/:id', validateUserUpdate, preventSelfModification, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const updates = req.body;
    
    const updatedUser = await adminService.updateUser(id, updates);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_user_updated',
      resource: 'admin',
      resourceId: id,
      details: { 
        targetUserId: id,
        changes: Object.keys(updates)
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log en acciones administrativas
    await adminService.logAdminAction(adminId, 'user_updated', id, {
      changes: updates
    });
    
    successResponse(res, updatedUser, 'Usuario actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/admin/users/:id/suspend - Suspender/reactivar usuario
router.post('/users/:id/suspend', validateUserSuspension, preventSelfModification, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { suspend = true, reason } = req.body;
    
    const updatedUser = await adminService.suspendUser(id, suspend, reason);
    
    await createAuditLog({
      userId: adminId,
      action: suspend ? 'admin_user_suspended' : 'admin_user_reactivated',
      resource: 'admin',
      resourceId: id,
      details: { 
        targetUserId: id,
        suspend,
        reason
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log en acciones administrativas
    await adminService.logAdminAction(adminId, suspend ? 'user_suspended' : 'user_reactivated', id, {
      reason
    });
    
    const message = suspend ? 'Usuario suspendido correctamente' : 'Usuario reactivado correctamente';
    successResponse(res, updatedUser, message);
  } catch (error) {
    console.error('Error al suspender/reactivar usuario:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// DELETE /api/admin/users/:id - Eliminar usuario (soft delete)
router.delete('/users/:id', validateUserId, preventSelfModification, requireSuperAdminRole, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    
    const result = await adminService.deleteUser(id, adminId);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_user_deleted',
      resource: 'admin',
      resourceId: id,
      details: { targetUserId: id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, result, 'Usuario eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== ESTADÍSTICAS =====

// GET /api/admin/stats - Estadísticas generales
router.get('/stats', validateStatsFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { dateFrom, dateTo } = req.query;
    
    const filters = { dateFrom, dateTo };
    const stats = await statsService.getGeneralStats(filters);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_general_stats_accessed',
      resource: 'admin',
      details: { filters },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, stats, 'Estadísticas generales obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener estadísticas generales:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/admin/stats/users - Estadísticas de usuarios
router.get('/stats/users', validateStatsFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { dateFrom, dateTo, role } = req.query;
    
    const filters = { dateFrom, dateTo, role };
    const stats = await statsService.getUserStats(filters);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_user_stats_accessed',
      resource: 'admin',
      details: { filters },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, stats, 'Estadísticas de usuarios obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener estadísticas de usuarios:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/admin/stats/appointments - Estadísticas de citas
router.get('/stats/appointments', validateStatsFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { dateFrom, dateTo, professionalId, status } = req.query;
    
    const filters = { dateFrom, dateTo, professionalId, status };
    const stats = await statsService.getAppointmentStats(filters);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_appointment_stats_accessed',
      resource: 'admin',
      details: { filters },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, stats, 'Estadísticas de citas obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener estadísticas de citas:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/admin/stats/revenue - Estadísticas de ingresos
router.get('/stats/revenue', validateStatsFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { dateFrom, dateTo, professionalId } = req.query;
    
    const filters = { dateFrom, dateTo, professionalId };
    const stats = await statsService.getRevenueStats(filters);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_revenue_stats_accessed',
      resource: 'admin',
      details: { filters },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, stats, 'Estadísticas de ingresos obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener estadísticas de ingresos:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/admin/stats/reviews - Estadísticas de reseñas
router.get('/stats/reviews', validateStatsFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { dateFrom, dateTo, professionalId } = req.query;
    
    const filters = { dateFrom, dateTo, professionalId };
    const stats = await statsService.getReviewStats(filters);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_review_stats_accessed',
      resource: 'admin',
      details: { filters },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, stats, 'Estadísticas de reseñas obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener estadísticas de reseñas:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/admin/stats/performance - Métricas de rendimiento
router.get('/stats/performance', async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const metrics = await statsService.getPerformanceMetrics();
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_performance_stats_accessed',
      resource: 'admin',
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, metrics, 'Métricas de rendimiento obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener métricas de rendimiento:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== GESTIÓN DE SUSCRIPCIONES =====

// GET /api/admin/subscriptions - Listar suscripciones
router.get('/subscriptions', validateSubscriptionFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { status, plan, userId, limit, offset } = req.query;
    
    const filters = { status, plan, userId };
    const pagination = {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    };
    
    const results = await adminService.getSubscriptions(filters, pagination);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_subscriptions_accessed',
      resource: 'admin',
      details: { 
        filters,
        resultsCount: results.subscriptions.length
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, results, 'Suscripciones obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/admin/subscriptions - Crear suscripción
router.post('/subscriptions', validateCreateSubscription, async (req, res) => {
  try {
    const adminId = req.user.id;
    const subscriptionData = req.body;
    
    const subscription = await adminService.createSubscription(subscriptionData);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_subscription_created',
      resource: 'admin',
      resourceId: subscription.id,
      details: { 
        subscriptionData: {
          userId: subscriptionData.userId,
          plan: subscriptionData.plan,
          price: subscriptionData.price
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log en acciones administrativas
    await adminService.logAdminAction(adminId, 'subscription_created', subscriptionData.userId, {
      subscriptionId: subscription.id,
      plan: subscriptionData.plan
    });
    
    createdResponse(res, subscription, 'Suscripción creada correctamente');
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// PUT /api/admin/subscriptions/:id - Actualizar suscripción
router.put('/subscriptions/:id', validateUpdateSubscription, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const updates = req.body;
    
    const updatedSubscription = await adminService.updateSubscription(id, updates);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_subscription_updated',
      resource: 'admin',
      resourceId: id,
      details: { 
        subscriptionId: id,
        changes: Object.keys(updates)
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log en acciones administrativas
    await adminService.logAdminAction(adminId, 'subscription_updated', null, {
      subscriptionId: id,
      changes: updates
    });
    
    successResponse(res, updatedSubscription, 'Suscripción actualizada correctamente');
  } catch (error) {
    console.error('Error al actualizar suscripción:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== ACCIONES ADMINISTRATIVAS =====

// GET /api/admin/actions - Obtener historial de acciones
router.get('/actions', validateAdminActionFilters, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { adminId: filterAdminId, actionType, targetUserId, dateFrom, dateTo, limit, offset } = req.query;
    
    const filters = {
      adminId: filterAdminId,
      actionType,
      targetUserId,
      dateFrom,
      dateTo
    };
    
    const pagination = {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };
    
    const results = await adminService.getAdminActions(filters, pagination);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_actions_accessed',
      resource: 'admin',
      details: { 
        filters,
        resultsCount: results.actions.length
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, results, 'Historial de acciones obtenido correctamente');
  } catch (error) {
    console.error('Error al obtener historial de acciones:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== CONFIGURACIÓN DEL SISTEMA =====

// GET /api/admin/settings - Obtener configuración del sistema
router.get('/settings', async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const settings = await adminService.getSystemSettings();
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_settings_accessed',
      resource: 'admin',
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, settings, 'Configuración del sistema obtenida correctamente');
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// PUT /api/admin/settings - Actualizar configuración del sistema
router.put('/settings', validateSystemSetting, requireSuperAdminRole, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { key, value } = req.body;
    
    const updatedSetting = await adminService.updateSystemSetting(key, value, adminId);
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_setting_updated',
      resource: 'admin',
      details: { 
        setting: key,
        newValue: value
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, updatedSetting, 'Configuración actualizada correctamente');
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== DASHBOARD =====

// GET /api/admin/dashboard - Dashboard principal de administración
router.get('/dashboard', async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Obtener estadísticas resumidas para el dashboard
    const [generalStats, userStats, appointmentStats, revenueStats] = await Promise.all([
      statsService.getGeneralStats(),
      statsService.getUserStats(),
      statsService.getAppointmentStats(),
      statsService.getRevenueStats()
    ]);
    
    const dashboardData = {
      general: generalStats.basic,
      users: {
        distribution: userStats.roleDistribution,
        verification: userStats.verification
      },
      appointments: {
        statusSummary: appointmentStats.statusSummary,
        dailyTrend: appointmentStats.dailyTrend.slice(-7) // Últimos 7 días
      },
      revenue: {
        summary: revenueStats.summary,
        monthlyTrend: revenueStats.monthlyTrend.slice(-6) // Últimos 6 meses
      }
    };
    
    await createAuditLog({
      userId: adminId,
      action: 'admin_dashboard_accessed',
      resource: 'admin',
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, dashboardData, 'Dashboard obtenido correctamente');
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

export default router;