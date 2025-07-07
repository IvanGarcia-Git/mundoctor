const { body, query, param, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responses');

// Validación para actualizar perfil de paciente
const validatePatientProfile = [
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
  
  body('date_of_birth')
    .optional()
    .isDate()
    .withMessage('La fecha de nacimiento debe ser una fecha válida'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('El género debe ser: male, female, o other'),
  
  body('blood_type')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Tipo de sangre no válido'),
  
  body('allergies')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Las alergias no pueden exceder 500 caracteres'),
  
  body('medical_conditions')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Las condiciones médicas no pueden exceder 500 caracteres'),
  
  body('medications')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Los medicamentos no pueden exceder 500 caracteres'),
  
  body('emergency_contact_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del contacto de emergencia debe tener entre 2 y 100 caracteres'),
  
  body('emergency_contact_phone')
    .optional()
    .isMobilePhone()
    .withMessage('El teléfono del contacto de emergencia debe ser válido'),
  
  body('insurance_provider')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El proveedor de seguro no puede exceder 100 caracteres'),
  
  body('insurance_policy_number')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El número de póliza no puede exceder 50 caracteres'),
  
  body('address')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La dirección no puede exceder 200 caracteres'),
  
  body('city')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La ciudad no puede exceder 100 caracteres'),
  
  body('state')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El estado no puede exceder 100 caracteres'),
  
  body('zip_code')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El código postal no puede exceder 20 caracteres'),
  
  body('country')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El país no puede exceder 100 caracteres'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos de validación incorrectos', errors.array());
    }
    next();
  }
];

// Validación para búsqueda de profesionales
const validateProfessionalSearch = [
  query('query')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La consulta debe tener entre 2 y 100 caracteres'),
  
  query('specialty')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La especialidad no puede exceder 100 caracteres'),
  
  query('location')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La ubicación no puede exceder 100 caracteres'),
  
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('La calificación mínima debe estar entre 0 y 5'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio máximo debe ser mayor a 0'),
  
  query('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Los años de experiencia deben estar entre 0 y 50'),
  
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
      return errorResponse(res, 400, 'Parámetros de búsqueda incorrectos', errors.array());
    }
    next();
  }
];

// Validación para búsqueda de profesionales cercanos
const validateNearbySearch = [
  query('latitude')
    .notEmpty()
    .isFloat({ min: -90, max: 90 })
    .withMessage('La latitud debe estar entre -90 y 90'),
  
  query('longitude')
    .notEmpty()
    .isFloat({ min: -180, max: 180 })
    .withMessage('La longitud debe estar entre -180 y 180'),
  
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('El radio debe estar entre 0.1 y 100 km'),
  
  query('specialty')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La especialidad no puede exceder 100 caracteres'),
  
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('La calificación mínima debe estar entre 0 y 5'),
  
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
      return errorResponse(res, 400, 'Parámetros de búsqueda cercana incorrectos', errors.array());
    }
    next();
  }
];

// Validación para filtros por especialidad
const validateSpecialtyFilter = [
  param('specialty')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La especialidad debe tener entre 2 y 100 caracteres'),
  
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('La calificación mínima debe estar entre 0 y 5'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio máximo debe ser mayor a 0'),
  
  query('location')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La ubicación no puede exceder 100 caracteres'),
  
  query('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Los años de experiencia deben estar entre 0 y 50'),
  
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
      return errorResponse(res, 400, 'Filtros de especialidad incorrectos', errors.array());
    }
    next();
  }
];

// Validación para contactos de emergencia
const validateEmergencyContact = [
  body('name')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('relationship')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La relación debe tener entre 2 y 50 caracteres'),
  
  body('phone')
    .notEmpty()
    .isMobilePhone()
    .withMessage('El teléfono debe ser un número válido'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('El email debe ser válido'),
  
  body('address')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La dirección no puede exceder 200 caracteres'),
  
  body('is_primary')
    .optional()
    .isBoolean()
    .withMessage('is_primary debe ser un valor booleano'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Datos del contacto de emergencia incorrectos', errors.array());
    }
    next();
  }
];

// Validación para actualizar contacto de emergencia
const validateUpdateEmergencyContact = [
  param('contactId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del contacto debe ser un UUID válido'),
  
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('relationship')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La relación debe tener entre 2 y 50 caracteres'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('El teléfono debe ser un número válido'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('El email debe ser válido'),
  
  body('address')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La dirección no puede exceder 200 caracteres'),
  
  body('is_primary')
    .optional()
    .isBoolean()
    .withMessage('is_primary debe ser un valor booleano'),
  
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
const validateContactId = [
  param('contactId')
    .notEmpty()
    .isUUID()
    .withMessage('El ID del contacto debe ser un UUID válido'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'ID de contacto no válido', errors.array());
    }
    next();
  }
];

const validateProfessionalId = [
  param('professionalId')
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

module.exports = {
  validatePatientProfile,
  validateProfessionalSearch,
  validateNearbySearch,
  validateSpecialtyFilter,
  validateEmergencyContact,
  validateUpdateEmergencyContact,
  validateContactId,
  validateProfessionalId
};