import express from 'express';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, createdResponse, errorResponse, paginatedResponse } from '../utils/responses.js';
import { 
  createAppointment, 
  getAppointments, 
  getAppointmentById, 
  updateAppointment, 
  cancelAppointment,
  getProfessionalAvailability 
} from '../services/appointmentService.js';
import { z } from 'zod';
import { auditMiddleware, AuditActions, RiskLevels } from '../utils/auditLog.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);
router.use(attachUser);

// Validation schemas
const appointmentCreateSchema = z.object({
  professionalId: z.string().min(1, 'Professional ID is required'),
  serviceId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  appointmentType: z.enum(['consultation', 'follow_up', 'emergency', 'teleconsultation', 'home_visit', 'routine_checkup']).default('consultation'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  isVirtual: z.boolean().default(false),
  locationAddress: z.string().max(500).optional(),
  meetingUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  fee: z.number().min(0).optional(),
  currency: z.string().length(3).default('EUR')
});

const appointmentUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  appointmentType: z.enum(['consultation', 'follow_up', 'emergency', 'teleconsultation', 'home_visit', 'routine_checkup']).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).optional(),
  isVirtual: z.boolean().optional(),
  locationAddress: z.string().max(500).optional(),
  meetingUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
  cancellationReason: z.string().max(500).optional(),
  fee: z.number().min(0).optional()
});

const appointmentQuerySchema = z.object({
  professionalId: z.string().optional(),
  patientId: z.string().optional(),
  status: z.union([
    z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']),
    z.array(z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']))
  ]).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  appointmentType: z.enum(['consultation', 'follow_up', 'emergency', 'teleconsultation', 'home_visit', 'routine_checkup']).optional(),
  isVirtual: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['scheduled_date', 'start_time', 'created_at', 'status', 'fee']).default('scheduled_date'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC')
});

const availabilityQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
});

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/',
  validateBody(appointmentCreateSchema),
  auditMiddleware({
    action: AuditActions.APPOINTMENT_CREATED,
    resource: 'appointment',
    riskLevel: RiskLevels.LOW
  }),
  asyncHandler(async (req, res) => {
    const appointmentData = {
      ...req.body,
      patientId: req.user.role === 'patient' ? req.user.id : req.body.patientId
    };

    // Validate that patients can only create appointments for themselves
    if (req.user.role === 'patient' && appointmentData.patientId !== req.user.id) {
      return errorResponse(res, 'Patients can only create appointments for themselves', 403);
    }

    // Validate that professionals can create appointments for any patient
    if (req.user.role === 'professional' && !appointmentData.patientId) {
      return errorResponse(res, 'Patient ID is required when creating appointments as a professional', 400);
    }

    const appointment = await createAppointment(appointmentData, req.user.id);
    
    return createdResponse(res, appointment, 'Appointment created successfully');
  })
);

/**
 * GET /api/appointments
 * Get appointments with filtering and pagination
 */
router.get('/',
  validateQuery(appointmentQuerySchema),
  asyncHandler(async (req, res) => {
    const filters = { ...req.query };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    // Apply role-based filtering
    if (req.user.role === 'patient') {
      filters.patientId = req.user.id;
    } else if (req.user.role === 'professional') {
      // Professionals can see their own appointments or filter by patient
      if (!filters.patientId) {
        filters.professionalId = req.user.id;
      }
    }
    // Admins can see all appointments

    // Remove pagination fields from filters
    delete filters.page;
    delete filters.limit;
    delete filters.sortBy;
    delete filters.sortOrder;

    const result = await getAppointments(filters, pagination);
    
    return paginatedResponse(res, result.appointments, result.pagination, 'Appointments retrieved successfully');
  })
);

/**
 * GET /api/appointments/:id
 * Get a specific appointment by ID
 */
router.get('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid appointment ID format')
  })),
  auditMiddleware({
    action: AuditActions.PATIENT_DATA_ACCESS,
    resource: 'appointment',
    riskLevel: RiskLevels.LOW,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const appointment = await getAppointmentById(req.params.id, req.user.id);
    
    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
                     req.user.id === appointment.professional_id ||
                     req.user.id === appointment.patient_id;

    if (!hasAccess) {
      return errorResponse(res, 'Access denied to this appointment', 403);
    }

    return successResponse(res, appointment, 'Appointment retrieved successfully');
  })
);

/**
 * PUT /api/appointments/:id
 * Update an appointment
 */
router.put('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid appointment ID format')
  })),
  validateBody(appointmentUpdateSchema),
  auditMiddleware({
    action: AuditActions.APPOINTMENT_UPDATED,
    resource: 'appointment',
    riskLevel: RiskLevels.MEDIUM,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const appointmentId = req.params.id;
    
    // Get current appointment to check permissions
    const currentAppointment = await getAppointmentById(appointmentId);
    
    const canUpdate = req.user.role === 'admin' ||
                     req.user.id === currentAppointment.professional_id ||
                     (req.user.id === currentAppointment.patient_id && 
                      !req.body.internalNotes); // Patients can't update internal notes

    if (!canUpdate) {
      return errorResponse(res, 'Access denied to update this appointment', 403);
    }

    // Patients have limited update permissions
    if (req.user.role === 'patient') {
      const allowedFields = ['notes', 'cancellationReason'];
      if (req.body.status === 'cancelled') {
        allowedFields.push('status');
      }
      
      const hasDisallowedFields = Object.keys(req.body).some(
        field => !allowedFields.includes(field)
      );
      
      if (hasDisallowedFields) {
        return errorResponse(res, 'Patients have limited update permissions', 403);
      }
    }

    const updatedAppointment = await updateAppointment(appointmentId, req.body, req.user.id);
    
    return successResponse(res, updatedAppointment, 'Appointment updated successfully');
  })
);

/**
 * DELETE /api/appointments/:id
 * Cancel an appointment
 */
router.delete('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid appointment ID format')
  })),
  validateBody(z.object({
    reason: z.string().min(1).max(500, 'Cancellation reason is required')
  })),
  auditMiddleware({
    action: AuditActions.APPOINTMENT_CANCELLED,
    resource: 'appointment',
    riskLevel: RiskLevels.MEDIUM,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const appointmentId = req.params.id;
    
    // Get current appointment to check permissions
    const currentAppointment = await getAppointmentById(appointmentId);
    
    const canCancel = req.user.role === 'admin' ||
                     req.user.id === currentAppointment.professional_id ||
                     req.user.id === currentAppointment.patient_id;

    if (!canCancel) {
      return errorResponse(res, 'Access denied to cancel this appointment', 403);
    }

    if (currentAppointment.status === 'cancelled') {
      return errorResponse(res, 'Appointment is already cancelled', 400);
    }

    if (currentAppointment.status === 'completed') {
      return errorResponse(res, 'Cannot cancel a completed appointment', 400);
    }

    const cancelledAppointment = await cancelAppointment(
      appointmentId, 
      req.body.reason, 
      req.user.id
    );
    
    return successResponse(res, cancelledAppointment, 'Appointment cancelled successfully');
  })
);

/**
 * PATCH /api/appointments/:id/status
 * Update appointment status
 */
router.patch('/:id/status',
  validateParams(z.object({
    id: z.string().uuid('Invalid appointment ID format')
  })),
  validateBody(z.object({
    status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']),
    notes: z.string().max(500).optional()
  })),
  requireRole(['professional', 'admin']), // Only professionals and admins can change status
  auditMiddleware({
    action: AuditActions.APPOINTMENT_UPDATED,
    resource: 'appointment_status',
    riskLevel: RiskLevels.MEDIUM,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const appointmentId = req.params.id;
    const { status, notes } = req.body;
    
    // Get current appointment to check permissions
    const currentAppointment = await getAppointmentById(appointmentId);
    
    // Professionals can only update their own appointments
    if (req.user.role === 'professional' && req.user.id !== currentAppointment.professional_id) {
      return errorResponse(res, 'Access denied to update this appointment', 403);
    }

    const updateData = { status };
    if (notes) {
      updateData.internalNotes = notes;
    }

    const updatedAppointment = await updateAppointment(appointmentId, updateData, req.user.id);
    
    return successResponse(res, updatedAppointment, 'Appointment status updated successfully');
  })
);

/**
 * GET /api/appointments/availability/:professionalId
 * Get professional availability for a date range
 */
router.get('/availability/:professionalId',
  validateParams(z.object({
    professionalId: z.string().min(1, 'Professional ID is required')
  })),
  validateQuery(availabilityQuerySchema),
  asyncHandler(async (req, res) => {
    const { professionalId } = req.params;
    const { dateFrom, dateTo } = req.query;

    // Validate date range (max 30 days)
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > 30) {
      return errorResponse(res, 'Date range cannot exceed 30 days', 400);
    }

    if (fromDate > toDate) {
      return errorResponse(res, 'Start date must be before end date', 400);
    }

    const availability = await getProfessionalAvailability(professionalId, dateFrom, dateTo);
    
    return successResponse(res, availability, 'Professional availability retrieved successfully');
  })
);

/**
 * POST /api/appointments/check-availability
 * Check if a specific time slot is available
 */
router.post('/check-availability',
  validateBody(z.object({
    professionalId: z.string().min(1, 'Professional ID is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    excludeAppointmentId: z.string().uuid().optional()
  })),
  asyncHandler(async (req, res) => {
    const { professionalId, date, startTime, endTime, excludeAppointmentId } = req.body;

    // Import the function - in a real app, this would be structured better
    const { checkAppointmentAvailability } = await import('../services/appointmentService.js');
    
    const isAvailable = await checkAppointmentAvailability(
      null, // We'll need to handle this differently for standalone calls
      professionalId,
      date,
      startTime,
      endTime,
      excludeAppointmentId
    );
    
    return successResponse(res, { 
      available: isAvailable,
      professionalId,
      date,
      startTime,
      endTime
    }, `Time slot is ${isAvailable ? 'available' : 'not available'}`);
  })
);

/**
 * GET /api/appointments/calendar/:professionalId
 * Get calendar view of appointments for a professional
 */
router.get('/calendar/:professionalId',
  validateParams(z.object({
    professionalId: z.string().min(1, 'Professional ID is required')
  })),
  validateQuery(z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2024).max(2030).optional(),
    view: z.enum(['month', 'week', 'day']).default('month')
  })),
  asyncHandler(async (req, res) => {
    const { professionalId } = req.params;
    const { month, year, view } = req.query;

    // Calculate date range based on view
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || now.getFullYear();

    let dateFrom, dateTo;

    if (view === 'month') {
      dateFrom = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      dateTo = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${lastDay}`;
    } else if (view === 'week') {
      // Get current week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      dateFrom = startOfWeek.toISOString().split('T')[0];
      dateTo = endOfWeek.toISOString().split('T')[0];
    } else { // day
      dateFrom = now.toISOString().split('T')[0];
      dateTo = dateFrom;
    }

    // Check permissions
    const canViewCalendar = req.user.role === 'admin' ||
                           req.user.id === professionalId ||
                           req.user.role === 'patient'; // Patients can view to book appointments

    if (!canViewCalendar) {
      return errorResponse(res, 'Access denied to view this calendar', 403);
    }

    const filters = { 
      professionalId,
      dateFrom,
      dateTo,
      status: ['scheduled', 'confirmed', 'in_progress', 'completed']
    };

    const result = await getAppointments(filters, { limit: 1000 }); // Large limit for calendar view
    
    // Get availability if user is a patient (for booking)
    let availability = null;
    if (req.user.role === 'patient') {
      availability = await getProfessionalAvailability(professionalId, dateFrom, dateTo);
    }

    return successResponse(res, {
      appointments: result.appointments,
      availability,
      period: {
        from: dateFrom,
        to: dateTo,
        view
      }
    }, 'Calendar data retrieved successfully');
  })
);

export default router;