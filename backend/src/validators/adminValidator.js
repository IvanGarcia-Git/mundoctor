import { body, query, param, validationResult } from 'express-validator';
import { errorResponse } from '../utils/responses.js';

// Validación para filtros de usuarios
export const validateUserFilters = [
  query('role')
    .optional()
    .isIn(['patient', 'professional', 'admin'])
    .withMessage('El rol debe ser: patient, professional, o admin'),
  
  query('status')
    .optional()
    .isIn(['active', 'suspended', 'deleted'])
    .withMessage('El estado debe ser: active, suspended, o deleted'),
  
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La búsqueda debe tener entre 2 y 100 caracteres'),
  
  query('dateFrom')
    .optional()
    .isDate()
    .withMessage('La fecha inicial debe ser una fecha válida'),
  
  query('dateTo')
    .optional()
    .isDate()
    .withMessage('La fecha final debe ser una fecha válida'),
  
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
    .isIn(['created_at', 'updated_at', 'first_name', 'last_name', 'email', 'role'])
    .withMessage('Campo de ordenamiento no válido'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('El orden debe ser ASC o DESC'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Filtros de búsqueda incorrectos', errors.array());
    }
    
    // Validación adicional: dateTo debe ser >= dateFrom
    const { dateFrom, dateTo } = req.query;
    if (dateFrom && dateTo && new Date(dateTo) < new Date(dateFrom)) {
      return errorResponse(res, 400, 'La fecha final debe ser mayor o igual a la inicial');
    }
    
    next();
  }
];

// Validación para actualización de usuarios
export const validateUserUpdate = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del usuario debe ser un UUID válido'),
  
  body('first_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  
  body('last_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('El teléfono debe ser un número válido'),
  
  body('role')
    .optional()
    .isIn(['patient', 'professional', 'admin'])
    .withMessage('El rol debe ser: patient, professional, o admin'),
  
  body('status')
    .optional()
    .isIn(['active', 'suspended', 'deleted'])
    .withMessage('El estado debe ser: active, suspended, o deleted'),
  
  body('email_verified')
    .optional()
    .isBoolean()
    .withMessage('email_verified debe ser un valor booleano'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de actualización incorrectos', errors.array());
    }
    next();
  }
];

// Validación para suspensión de usuarios
export const validateUserSuspension = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del usuario debe ser un UUID válido'),
  
  body('suspend')
    .optional()
    .isBoolean()
    .withMessage('suspend debe ser un valor booleano'),
  
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La razón debe tener entre 10 y 500 caracteres'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de suspensión incorrectos', errors.array());
    }
    next();
  }
];

// Validación para IDs de usuario
export const validateUserId = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del usuario debe ser un UUID válido'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'ID de usuario no válido', errors.array());
    }
    next();
  }
];

// Validación para filtros de estadísticas
export const validateStatsFilters = [
  query('dateFrom')
    .optional()
    .isDate()
    .withMessage('La fecha inicial debe ser una fecha válida'),
  
  query('dateTo')
    .optional()
    .isDate()
    .withMessage('La fecha final debe ser una fecha válida'),
  
  query('role')
    .optional()
    .isIn(['patient', 'professional', 'admin'])
    .withMessage('El rol debe ser: patient, professional, o admin'),
  
  query('professionalId')
    .optional()
    .isUUID()
    .withMessage('El ID del profesional debe ser un UUID válido'),
  
  query('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'])
    .withMessage('Estado de cita no válido'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Filtros de estadísticas incorrectos', errors.array());
    }
    
    // Validación adicional: dateTo debe ser >= dateFrom
    const { dateFrom, dateTo } = req.query;
    if (dateFrom && dateTo && new Date(dateTo) < new Date(dateFrom)) {
      return errorResponse(res, 400, 'La fecha final debe ser mayor o igual a la inicial');
    }
    
    next();
  }
];

// Validación para filtros de suscripciones
export const validateSubscriptionFilters = [
  query('status')
    .optional()
    .isIn(['active', 'cancelled', 'expired', 'suspended'])
    .withMessage('Estado de suscripción no válido'),
  
  query('plan')
    .optional()
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Plan de suscripción no válido'),
  
  query('userId')
    .optional()
    .isUUID()
    .withMessage('El ID del usuario debe ser un UUID válido'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser mayor o igual a 0'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Filtros de suscripción incorrectos', errors.array());
    }
    next();
  }
];

// Validación para crear suscripción
export const validateCreateSubscription = [
  body('userId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del usuario debe ser un UUID válido'),
  
  body('plan')
    .notEmpty()
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Plan de suscripción no válido'),
  
  body('price')
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número mayor o igual a 0'),
  
  body('billingCycle')
    .notEmpty()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('El ciclo de facturación debe ser: monthly, quarterly, o yearly'),
  
  body('startDate')
    .notEmpty()
    .isDate()
    .withMessage('La fecha de inicio debe ser una fecha válida'),
  
  body('endDate')
    .optional()
    .isDate()
    .withMessage('La fecha de fin debe ser una fecha válida'),
  
  body('paymentMethod')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El método de pago no puede exceder 50 caracteres'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de suscripción incorrectos', errors.array());
    }
    
    // Validación adicional: endDate debe ser >= startDate
    const { startDate, endDate } = req.body;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return errorResponse(res, 400, 'La fecha de fin debe ser mayor o igual a la de inicio');
    }
    
    next();
  }
];

// Validación para actualizar suscripción
export const validateUpdateSubscription = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID de la suscripción debe ser un UUID válido'),
  
  body('plan')
    .optional()
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Plan de suscripción no válido'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número mayor o igual a 0'),
  
  body('billing_cycle')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('El ciclo de facturación debe ser: monthly, quarterly, o yearly'),
  
  body('status')
    .optional()
    .isIn(['active', 'cancelled', 'expired', 'suspended'])
    .withMessage('Estado de suscripción no válido'),
  
  body('start_date')
    .optional()
    .isDate()
    .withMessage('La fecha de inicio debe ser una fecha válida'),
  
  body('end_date')
    .optional()
    .isDate()
    .withMessage('La fecha de fin debe ser una fecha válida'),
  
  body('payment_method')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El método de pago no puede exceder 50 caracteres'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de actualización incorrectos', errors.array());
    }
    next();
  }
];

// Validación para configuración del sistema
export const validateSystemSetting = [
  body('key')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La clave debe tener entre 2 y 100 caracteres'),
  
  body('value')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('El valor no puede exceder 1000 caracteres'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de configuración incorrectos', errors.array());
    }
    next();
  }
];

// Validación para filtros de acciones administrativas
export const validateAdminActionFilters = [
  query('adminId')
    .optional()
    .isUUID()
    .withMessage('El ID del administrador debe ser un UUID válido'),
  
  query('actionType')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El tipo de acción no puede exceder 100 caracteres'),
  
  query('targetUserId')
    .optional()
    .isUUID()
    .withMessage('El ID del usuario objetivo debe ser un UUID válido'),
  
  query('dateFrom')
    .optional()
    .isDate()
    .withMessage('La fecha inicial debe ser una fecha válida'),
  
  query('dateTo')
    .optional()
    .isDate()
    .withMessage('La fecha final debe ser una fecha válida'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('El límite debe estar entre 1 y 200'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser mayor o igual a 0'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Filtros de acciones incorrectos', errors.array());
    }
    
    // Validación adicional: dateTo debe ser >= dateFrom
    const { dateFrom, dateTo } = req.query;
    if (dateFrom && dateTo && new Date(dateTo) < new Date(dateFrom)) {
      return errorResponse(res, 400, 'La fecha final debe ser mayor o igual a la inicial');
    }
    
    next();
  }
];

// Middleware para verificar permisos de administrador
export const requireAdminRole = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Usuario no autenticado');
  }
  
  if (req.user.role !== 'admin') {
    return errorResponse(res, 403, 'Se requieren permisos de administrador');
  }
  
  next();
};

// Middleware para verificar permisos de super administrador
export const requireSuperAdminRole = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Usuario no autenticado');
  }
  
  if (req.user.role !== 'admin' || !req.user.is_super_admin) {
    return errorResponse(res, 403, 'Se requieren permisos de super administrador');
  }
  
  next();
};

// Middleware para verificar que no se está modificando a sí mismo
export const preventSelfModification = (req, res, next) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user.id;
  
  if (targetUserId === currentUserId) {
    return errorResponse(res, 400, 'No puedes modificar tu propio usuario desde esta interfaz');
  }
  
  next();
};

// Middleware para validar operaciones críticas
export const validateCriticalOperation = [
  body('confirmPassword')
    .notEmpty()
    .withMessage('Se requiere confirmación de contraseña para operaciones críticas'),
  
  body('reason')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Se requiere una razón detallada (10-500 caracteres)'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validación de operación crítica fallida', errors.array());
    }
    next();
  }
];