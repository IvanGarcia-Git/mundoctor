import express from 'express';
import ticketService from '../services/ticketService.js';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import {
  validateCreateTicket,
  validateUpdateTicket,
  validateAddMessage,
  validateListTickets,
  validateTicketStats,
  validateAssignTicket,
  validateStatusChange,
  validateTicketId,
  validateAdminPermissions,
  validateSuperAdminPermissions,
  validateTicketAccess
} from '../validators/ticketValidator.js';
import { createAuditLog as auditLog } from '../utils/auditLog.js';
import { successResponse, errorResponse } from '../utils/responses.js';

const router = express.Router();

// Middleware para autenticación en todas las rutas
router.use(requireAuth);

// ===== RUTAS PARA USUARIOS =====

// POST /api/tickets - Crear nuevo ticket de soporte
router.post('/', validateCreateTicket, async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketData = {
      userId,
      ...req.body
    };

    const ticket = await ticketService.createTicket(ticketData);

    await auditLog(userId, 'support_ticket_created', {
      action: 'create_ticket',
      ticket_id: ticket.id,
      category: ticket.category,
      priority: ticket.priority,
      ip: req.ip
    });

    successResponse(res, ticket, 'Ticket de soporte creado correctamente', 201);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/tickets - Listar tickets (con filtros para usuarios y admins)
router.get('/', validateListTickets, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Preparar filtros basados en el rol del usuario
    const filters = { ...req.query };
    
    // Si no es admin, solo mostrar sus propios tickets
    if (userRole !== 'admin') {
      filters.userId = userId;
    }

    const pagination = {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await ticketService.getTickets(filters, pagination);

    await auditLog(userId, 'support_tickets_accessed', {
      action: 'list_tickets',
      filters: filters,
      count: result.tickets.length,
      ip: req.ip
    });

    successResponse(res, result, 'Tickets obtenidos correctamente');
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/tickets/:ticketId - Obtener ticket específico
router.get('/:ticketId', validateTicketId, validateTicketAccess, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    const ticket = await ticketService.getTicketById(ticketId);

    if (!ticket) {
      return errorResponse(res, 404, 'Ticket no encontrado');
    }

    await auditLog(userId, 'support_ticket_accessed', {
      action: 'view_ticket',
      ticket_id: ticketId,
      ip: req.ip
    });

    successResponse(res, ticket, 'Ticket obtenido correctamente');
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/tickets/:ticketId/messages - Agregar mensaje a ticket
router.post('/:ticketId/messages', validateAddMessage, validateTicketAccess, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const messageData = {
      userId,
      ...req.body
    };

    const message = await ticketService.addMessage(ticketId, messageData);

    await auditLog(userId, 'ticket_message_added', {
      action: 'add_message',
      ticket_id: ticketId,
      message_length: req.body.message?.length || 0,
      is_internal: req.body.is_internal || false,
      ip: req.ip
    });

    successResponse(res, message, 'Mensaje agregado correctamente', 201);
  } catch (error) {
    console.error('Error al agregar mensaje:', error);
    if (error.message === 'Ticket no encontrado') {
      return errorResponse(res, 404, error.message);
    }
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== RUTAS PARA ADMINISTRADORES =====

// PUT /api/tickets/:ticketId - Actualizar ticket (solo admins)
router.put('/:ticketId', validateUpdateTicket, validateAdminPermissions, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const ticket = await ticketService.updateTicket(ticketId, updates, userId);

    await auditLog(userId, 'support_ticket_updated', {
      action: 'update_ticket',
      ticket_id: ticketId,
      updates: Object.keys(updates),
      ip: req.ip
    });

    successResponse(res, ticket, 'Ticket actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    if (error.message === 'Ticket no encontrado') {
      return errorResponse(res, 404, error.message);
    }
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// PATCH /api/tickets/:ticketId/status - Cambiar estado del ticket
router.patch('/:ticketId/status', validateStatusChange, validateAdminPermissions, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const { status, resolution } = req.body;

    const updates = { status };
    if (resolution) {
      updates.resolution = resolution;
    }

    const ticket = await ticketService.updateTicket(ticketId, updates, userId);

    await auditLog(userId, 'ticket_status_changed', {
      action: 'change_status',
      ticket_id: ticketId,
      new_status: status,
      ip: req.ip
    });

    successResponse(res, ticket, 'Estado del ticket actualizado correctamente');
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    if (error.message === 'Ticket no encontrado') {
      return errorResponse(res, 404, error.message);
    }
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/tickets/:ticketId/assign - Asignar ticket a administrador
router.post('/:ticketId/assign', validateAssignTicket, validateAdminPermissions, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { adminId } = req.body;
    const userId = req.user.id;

    const updates = {
      assigned_admin_id: adminId,
      status: 'assigned'
    };

    const ticket = await ticketService.updateTicket(ticketId, updates, userId);

    await auditLog(userId, 'ticket_assigned', {
      action: 'assign_ticket',
      ticket_id: ticketId,
      assigned_to: adminId,
      ip: req.ip
    });

    successResponse(res, ticket, 'Ticket asignado correctamente');
  } catch (error) {
    console.error('Error al asignar ticket:', error);
    if (error.message === 'Ticket no encontrado') {
      return errorResponse(res, 404, error.message);
    }
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/tickets/escalate - Escalar tickets automáticamente
router.post('/escalate', validateSuperAdminPermissions, async (req, res) => {
  try {
    const userId = req.user.id;

    const escalatedTickets = await ticketService.escalateTickets();

    await auditLog(userId, 'tickets_escalated', {
      action: 'escalate_tickets',
      escalated_count: escalatedTickets.length,
      ticket_ids: escalatedTickets.map(t => t.id),
      ip: req.ip
    });

    successResponse(res, {
      escalated_tickets: escalatedTickets,
      count: escalatedTickets.length
    }, 'Tickets escalados correctamente');
  } catch (error) {
    console.error('Error al escalar tickets:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/tickets/stats - Obtener estadísticas de tickets
router.get('/admin/stats', validateTicketStats, validateAdminPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      adminId: req.query.adminId
    };

    const stats = await ticketService.getTicketStats(filters);

    await auditLog(userId, 'ticket_stats_accessed', {
      action: 'get_stats',
      filters: filters,
      ip: req.ip
    });

    successResponse(res, stats, 'Estadísticas obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/tickets/close-inactive - Cerrar tickets inactivos
router.post('/admin/close-inactive', validateSuperAdminPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const { daysInactive = 30 } = req.body;

    const closedTickets = await ticketService.closeInactiveTickets(daysInactive);

    await auditLog(userId, 'tickets_auto_closed', {
      action: 'close_inactive_tickets',
      days_inactive: daysInactive,
      closed_count: closedTickets.length,
      ticket_ids: closedTickets.map(t => t.id),
      ip: req.ip
    });

    successResponse(res, {
      closed_tickets: closedTickets,
      count: closedTickets.length
    }, 'Tickets inactivos cerrados correctamente');
  } catch (error) {
    console.error('Error al cerrar tickets inactivos:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== RUTAS ADICIONALES =====

// GET /api/tickets/my/summary - Resumen personal de tickets
router.get('/my/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let filters = {};
    
    if (userRole === 'admin') {
      filters.assignedAdminId = userId;
    } else {
      filters.userId = userId;
    }

    const result = await ticketService.getTickets(filters, { limit: 1000 });
    
    // Calcular resumen
    const summary = {
      total: result.total,
      open: result.tickets.filter(t => t.status === 'open').length,
      in_progress: result.tickets.filter(t => t.status === 'in_progress').length,
      resolved: result.tickets.filter(t => t.status === 'resolved').length,
      urgent: result.tickets.filter(t => t.priority === 'urgent').length,
      high: result.tickets.filter(t => t.priority === 'high').length
    };

    await auditLog(userId, 'ticket_summary_accessed', {
      action: 'get_summary',
      user_role: userRole,
      ip: req.ip
    });

    successResponse(res, summary, 'Resumen de tickets obtenido correctamente');
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/tickets/categories - Obtener categorías disponibles
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'technical', label: 'Soporte Técnico', description: 'Problemas técnicos con la plataforma' },
      { value: 'billing', label: 'Facturación', description: 'Consultas sobre pagos y facturación' },
      { value: 'account', label: 'Cuenta', description: 'Problemas con la cuenta de usuario' },
      { value: 'general', label: 'General', description: 'Consultas generales y otros temas' }
    ];

    successResponse(res, categories, 'Categorías obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/tickets/priorities - Obtener prioridades disponibles
router.get('/priorities', async (req, res) => {
  try {
    const priorities = [
      { value: 'low', label: 'Baja', description: 'No urgente, puede esperar' },
      { value: 'medium', label: 'Media', description: 'Prioridad normal' },
      { value: 'high', label: 'Alta', description: 'Requiere atención pronto' },
      { value: 'urgent', label: 'Urgente', description: 'Requiere atención inmediata' }
    ];

    successResponse(res, priorities, 'Prioridades obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener prioridades:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

export default router;