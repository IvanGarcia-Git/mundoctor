import { body, query, param, validationResult } from 'express-validator';
import { errorResponse } from '../utils/responses.js';
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_CATEGORY } from '../models/ticketModel.js';

// Validación para crear ticket
export const validateCreateTicket = [
  body('title')
    .notEmpty()
    .withMessage('El título es requerido')
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('El título debe tener entre 5 y 200 caracteres'),

  body('description')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La descripción debe tener entre 10 y 2000 caracteres'),

  body('category')
    .notEmpty()
    .withMessage('La categoría es requerida')
    .isIn(Object.values(TICKET_CATEGORY))
    .withMessage(`La categoría debe ser una de: ${Object.values(TICKET_CATEGORY).join(', ')}`),

  body('priority')
    .optional()
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(`La prioridad debe ser una de: ${Object.values(TICKET_PRIORITY).join(', ')}`),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de ticket incorrectos', errors.array());
    }
    next();
  }
];

// Validación para actualizar ticket
export const validateUpdateTicket = [
  param('ticketId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del ticket debe ser un UUID válido'),

  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('El título debe tener entre 5 y 200 caracteres'),

  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La descripción debe tener entre 10 y 2000 caracteres'),

  body('category')
    .optional()
    .isIn(Object.values(TICKET_CATEGORY))
    .withMessage(`La categoría debe ser una de: ${Object.values(TICKET_CATEGORY).join(', ')}`),

  body('priority')
    .optional()
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(`La prioridad debe ser una de: ${Object.values(TICKET_PRIORITY).join(', ')}`),

  body('status')
    .optional()
    .isIn(Object.values(TICKET_STATUS))
    .withMessage(`El estado debe ser uno de: ${Object.values(TICKET_STATUS).join(', ')}`),

  body('assigned_admin_id')
    .optional()
    .isUUID()
    .withMessage('El ID del administrador debe ser un UUID válido'),

  body('resolution')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La resolución no puede exceder 2000 caracteres'),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de actualización incorrectos', errors.array());
    }
    next();
  }
];

// Validación para agregar mensaje
export const validateAddMessage = [
  param('ticketId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del ticket debe ser un UUID válido'),

  body('message')
    .notEmpty()
    .withMessage('El mensaje es requerido')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('El mensaje debe tener entre 1 y 2000 caracteres'),

  body('is_internal')
    .optional()
    .isBoolean()
    .withMessage('is_internal debe ser un valor booleano'),

  body('attachments')
    .optional()
    .isArray()
    .withMessage('Los adjuntos deben ser un array'),

  body('attachments.*.filename')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El nombre del archivo debe tener entre 1 y 255 caracteres'),

  body('attachments.*.size')
    .optional()
    .isInt({ min: 1, max: 10485760 }) // 10MB max
    .withMessage('El tamaño del archivo debe estar entre 1 byte y 10MB'),

  body('attachments.*.type')
    .optional()
    .isString()
    .isIn([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])
    .withMessage('Tipo de archivo no permitido'),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos del mensaje incorrectos', errors.array());
    }
    next();
  }
];

// Validación para listar tickets
export const validateListTickets = [
  query('userId')
    .optional()
    .isUUID()
    .withMessage('El ID del usuario debe ser un UUID válido'),

  query('assignedAdminId')
    .optional()
    .isUUID()
    .withMessage('El ID del administrador debe ser un UUID válido'),

  query('category')
    .optional()
    .isIn(Object.values(TICKET_CATEGORY))
    .withMessage(`La categoría debe ser una de: ${Object.values(TICKET_CATEGORY).join(', ')}`),

  query('priority')
    .optional()
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(`La prioridad debe ser una de: ${Object.values(TICKET_PRIORITY).join(', ')}`),

  query('status')
    .optional()
    .isIn(Object.values(TICKET_STATUS))
    .withMessage(`El estado debe ser uno de: ${Object.values(TICKET_STATUS).join(', ')}`),

  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La búsqueda debe tener entre 2 y 100 caracteres'),

  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom debe ser una fecha ISO válida'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo debe ser una fecha ISO válida'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser mayor o igual a 0'),

  query('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at', 'priority', 'status', 'title'])
    .withMessage('sortBy debe ser: created_at, updated_at, priority, status o title'),

  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('sortOrder debe ser ASC o DESC'),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Parámetros de consulta incorrectos', errors.array());
    }
    next();
  }
];

// Validación para obtener estadísticas
export const validateTicketStats = [
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom debe ser una fecha ISO válida'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo debe ser una fecha ISO válida'),

  query('adminId')
    .optional()
    .isUUID()
    .withMessage('El ID del administrador debe ser un UUID válido'),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Parámetros de estadísticas incorrectos', errors.array());
    }
    next();
  }
];

// Validación para asignación de ticket
export const validateAssignTicket = [
  param('ticketId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del ticket debe ser un UUID válido'),

  body('adminId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del administrador es requerido y debe ser un UUID válido'),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de asignación incorrectos', errors.array());
    }
    next();
  }
];

// Validación para cambio de estado
export const validateStatusChange = [
  param('ticketId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del ticket debe ser un UUID válido'),

  body('status')
    .notEmpty()
    .isIn(Object.values(TICKET_STATUS))
    .withMessage(`El estado debe ser uno de: ${Object.values(TICKET_STATUS).join(', ')}`),

  body('resolution')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La resolución no puede exceder 2000 caracteres'),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de cambio de estado incorrectos', errors.array());
    }
    next();
  }
];

// Validación para ID de ticket
export const validateTicketId = [
  param('ticketId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del ticket debe ser un UUID válido'),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'ID de ticket no válido', errors.array());
    }
    next();
  }
];

// Validación para escalamiento automático
export const validateEscalationSettings = [
  body('escalationRules')
    .notEmpty()
    .isObject()
    .withMessage('Las reglas de escalamiento son requeridas'),

  body('escalationRules.*.hours')
    .isInt({ min: 1, max: 720 })
    .withMessage('Las horas deben estar entre 1 y 720 (30 días)'),

  body('escalationRules.*.escalate_to')
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(`escalate_to debe ser una prioridad válida`),

  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Configuración de escalamiento incorrecta', errors.array());
    }
    next();
  }
];

// Middleware personalizado para validar transiciones de estado
export const validateStatusTransition = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status: newStatus } = req.body;

    // Esta validación se puede expandir para verificar la transición
    // contra la base de datos si es necesario
    if (!newStatus) {
      return next();
    }

    // Aquí se podría agregar lógica para verificar transiciones válidas
    // basadas en el estado actual del ticket en la base de datos
    
    next();
  } catch (error) {
    return errorResponse(res, 500, 'Error al validar transición de estado');
  }
};

// Middleware para validar permisos de administrador
export const validateAdminPermissions = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return errorResponse(res, 403, 'Acceso denegado. Se requieren permisos de administrador');
  }
  next();
};

// Middleware para validar permisos de super administrador
export const validateSuperAdminPermissions = (req, res, next) => {
  if (req.user.role !== 'admin' || !req.user.is_super_admin) {
    return errorResponse(res, 403, 'Acceso denegado. Se requieren permisos de super administrador');
  }
  next();
};

// Middleware para validar que el usuario puede acceder al ticket
export const validateTicketAccess = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { id: userId, role } = req.user;

    // Los administradores pueden acceder a todos los tickets
    if (role === 'admin') {
      return next();
    }

    // Para usuarios normales, verificar que el ticket les pertenece
    // Esta validación se puede expandir con consulta a base de datos
    
    next();
  } catch (error) {
    return errorResponse(res, 500, 'Error al validar acceso al ticket');
  }
};