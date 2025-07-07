import { body, query, param, validationResult } from 'express-validator';
import { errorResponse } from '../utils/responses.js';

// Validación para crear reseña
export const validateCreateReview = [
  body('professionalId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del profesional debe ser un UUID válido'),
  
  body('appointmentId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID de la cita debe ser un UUID válido'),
  
  body('rating')
    .notEmpty()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser un número entre 1 y 5'),
  
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('El comentario debe tener entre 10 y 1000 caracteres'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de validación incorrectos', errors.array());
    }
    next();
  }
];

// Validación para actualizar reseña
export const validateUpdateReview = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID de la reseña debe ser un UUID válido'),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser un número entre 1 y 5'),
  
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('El comentario debe tener entre 10 y 1000 caracteres'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de actualización incorrectos', errors.array());
    }
    next();
  }
];

// Validación para parámetros de ID
export const validateReviewId = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID de la reseña debe ser un UUID válido'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'ID de reseña no válido', errors.array());
    }
    next();
  }
];

// Validación para parámetros de profesional
export const validateProfessionalId = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del profesional debe ser un UUID válido'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'ID de profesional no válido', errors.array());
    }
    next();
  }
];

// Validación para búsqueda y filtros de reseñas
export const validateReviewFilters = [
  query('professionalId')
    .optional()
    .isUUID()
    .withMessage('El ID del profesional debe ser un UUID válido'),
  
  query('patientId')
    .optional()
    .isUUID()
    .withMessage('El ID del paciente debe ser un UUID válido'),
  
  query('minRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación mínima debe estar entre 1 y 5'),
  
  query('maxRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación máxima debe estar entre 1 y 5'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser mayor o igual a 0'),
  
  query('dateFrom')
    .optional()
    .isDate()
    .withMessage('La fecha inicial debe ser una fecha válida'),
  
  query('dateTo')
    .optional()
    .isDate()
    .withMessage('La fecha final debe ser una fecha válida'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Filtros de búsqueda incorrectos', errors.array());
    }
    
    // Validación adicional: maxRating debe ser >= minRating
    const { minRating, maxRating } = req.query;
    if (minRating && maxRating && parseInt(maxRating) < parseInt(minRating)) {
      return errorResponse(res, 400, 'La calificación máxima debe ser mayor o igual a la mínima');
    }
    
    // Validación adicional: dateTo debe ser >= dateFrom
    const { dateFrom, dateTo } = req.query;
    if (dateFrom && dateTo && new Date(dateTo) < new Date(dateFrom)) {
      return errorResponse(res, 400, 'La fecha final debe ser mayor o igual a la inicial');
    }
    
    next();
  }
];

// Validación para paginación de reseñas de profesional
export const validateProfessionalReviewsPagination = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del profesional debe ser un UUID válido'),
  
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
      return errorResponse(res, 400, 'Parámetros de paginación incorrectos', errors.array());
    }
    next();
  }
];

// Validación para estadísticas de reseñas
export const validateReviewStatsFilters = [
  query('professionalId')
    .optional()
    .isUUID()
    .withMessage('El ID del profesional debe ser un UUID válido'),
  
  query('dateFrom')
    .optional()
    .isDate()
    .withMessage('La fecha inicial debe ser una fecha válida'),
  
  query('dateTo')
    .optional()
    .isDate()
    .withMessage('La fecha final debe ser una fecha válida'),
  
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

// Validación para verificar legitimidad de reseña
export const validateReviewLegitimacy = [
  body('professionalId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del profesional debe ser un UUID válido'),
  
  body('appointmentId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID de la cita debe ser un UUID válido'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de verificación incorrectos', errors.array());
    }
    next();
  }
];

// Middleware personalizado para verificar permisos de reseña
export const checkReviewPermissions = (allowedRoles = ['patient']) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Usuario no autenticado');
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 403, 'No tienes permisos para esta operación');
    }
    
    next();
  };
};

// Middleware para verificar que el usuario puede moderar contenido
export const checkModerationPermissions = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Usuario no autenticado');
  }
  
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return errorResponse(res, 403, 'No tienes permisos de moderación');
  }
  
  next();
};