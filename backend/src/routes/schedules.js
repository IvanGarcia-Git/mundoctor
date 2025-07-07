import express from 'express';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, createdResponse, errorResponse, noContentResponse } from '../utils/responses.js';
import { query, withTransaction } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';
import { z } from 'zod';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);
router.use(attachUser);

// Validation schemas
const scheduleCreateSchema = z.object({
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  isAvailable: z.boolean().default(true),
  breakStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  breakEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  timezone: z.string().default('Europe/Madrid'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  effectiveUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional()
}).refine(data => {
  // Validate that start time is before end time
  const start = data.startTime.split(':').map(Number);
  const end = data.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  return startMinutes < endMinutes;
}, {
  message: 'Start time must be before end time',
  path: ['endTime']
}).refine(data => {
  // Validate break times if provided
  if (!data.breakStartTime || !data.breakEndTime) return true;
  
  const start = data.startTime.split(':').map(Number);
  const end = data.endTime.split(':').map(Number);
  const breakStart = data.breakStartTime.split(':').map(Number);
  const breakEnd = data.breakEndTime.split(':').map(Number);
  
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  const breakStartMinutes = breakStart[0] * 60 + breakStart[1];
  const breakEndMinutes = breakEnd[0] * 60 + breakEnd[1];
  
  return breakStartMinutes < breakEndMinutes &&
         breakStartMinutes >= startMinutes &&
         breakEndMinutes <= endMinutes;
}, {
  message: 'Break times must be within schedule hours and break start must be before break end',
  path: ['breakEndTime']
});

const scheduleUpdateSchema = scheduleCreateSchema.partial();

const exceptionCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isAvailable: z.boolean().default(false),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional()
}).refine(data => {
  // If available, must have start and end times
  if (data.isAvailable && (!data.startTime || !data.endTime)) {
    return false;
  }
  
  // If times provided, start must be before end
  if (data.startTime && data.endTime) {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return startMinutes < endMinutes;
  }
  
  return true;
}, {
  message: 'Available exceptions must have valid start and end times',
  path: ['endTime']
});

/**
 * POST /api/schedules
 * Create a new schedule entry
 */
router.post('/',
  validateBody(scheduleCreateSchema),
  requireRole(['professional', 'admin']),
  asyncHandler(async (req, res) => {
    const scheduleData = req.body;
    const professionalId = req.user.role === 'professional' ? req.user.id : scheduleData.professionalId;

    if (!professionalId) {
      return errorResponse(res, 'Professional ID is required', 400);
    }

    // Verify professional exists
    const professionalResult = await query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [professionalId, 'professional']
    );

    if (professionalResult.rows.length === 0) {
      return errorResponse(res, 'Professional not found', 404);
    }

    const result = await withTransaction(async (client) => {
      // Check for existing schedule on the same day
      const existingResult = await client.query(`
        SELECT * FROM professional_schedules 
        WHERE professional_id = $1 AND day_of_week = $2
          AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
      `, [professionalId, scheduleData.dayOfWeek]);

      if (existingResult.rows.length > 0) {
        // End the existing schedule if creating a new one
        await client.query(`
          UPDATE professional_schedules 
          SET effective_until = CURRENT_DATE - INTERVAL '1 day',
              updated_at = CURRENT_TIMESTAMP
          WHERE professional_id = $1 AND day_of_week = $2
            AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
        `, [professionalId, scheduleData.dayOfWeek]);
      }

      // Create new schedule
      const insertResult = await client.query(`
        INSERT INTO professional_schedules (
          professional_id, day_of_week, start_time, end_time, is_available,
          break_start_time, break_end_time, timezone, effective_from, effective_until
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        professionalId,
        scheduleData.dayOfWeek,
        scheduleData.startTime,
        scheduleData.endTime,
        scheduleData.isAvailable,
        scheduleData.breakStartTime,
        scheduleData.breakEndTime,
        scheduleData.timezone,
        scheduleData.effectiveFrom || new Date().toISOString().split('T')[0],
        scheduleData.effectiveUntil
      ]);

      return insertResult.rows[0];
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: AuditActions.USER_UPDATED,
      resource: 'professional_schedule',
      resourceId: result.id,
      details: {
        professionalId,
        dayOfWeek: scheduleData.dayOfWeek,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        isAvailable: scheduleData.isAvailable
      },
      riskLevel: RiskLevels.LOW,
    });

    logInfo('Professional schedule created', {
      scheduleId: result.id,
      professionalId,
      dayOfWeek: scheduleData.dayOfWeek,
      createdBy: req.user.id
    });

    return createdResponse(res, result, 'Schedule created successfully');
  })
);

/**
 * GET /api/schedules
 * Get professional schedules
 */
router.get('/',
  validateQuery(z.object({
    professionalId: z.string().optional(),
    dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
    isAvailable: z.coerce.boolean().optional(),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })),
  asyncHandler(async (req, res) => {
    const { professionalId, dayOfWeek, isAvailable, effectiveDate } = req.query;

    // Determine which professional's schedule to fetch
    let targetProfessionalId = professionalId;
    if (req.user.role === 'professional' && !professionalId) {
      targetProfessionalId = req.user.id;
    }

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (targetProfessionalId) {
      whereConditions.push(`ps.professional_id = $${paramIndex++}`);
      params.push(targetProfessionalId);
    }

    if (dayOfWeek) {
      whereConditions.push(`ps.day_of_week = $${paramIndex++}`);
      params.push(dayOfWeek);
    }

    if (isAvailable !== undefined) {
      whereConditions.push(`ps.is_available = $${paramIndex++}`);
      params.push(isAvailable);
    }

    const checkDate = effectiveDate || new Date().toISOString().split('T')[0];
    whereConditions.push(`ps.effective_from <= $${paramIndex++}`);
    params.push(checkDate);
    whereConditions.push(`(ps.effective_until IS NULL OR ps.effective_until >= $${paramIndex++})`);
    params.push(checkDate);

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(`
      SELECT 
        ps.*,
        u.name as professional_name,
        u.email as professional_email
      FROM professional_schedules ps
      LEFT JOIN users u ON ps.professional_id = u.id
      ${whereClause}
      ORDER BY 
        CASE ps.day_of_week
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
        END,
        ps.start_time
    `, params);

    logInfo('Professional schedules retrieved', {
      count: result.rows.length,
      professionalId: targetProfessionalId,
      requestedBy: req.user.id
    });

    return successResponse(res, result.rows, 'Schedules retrieved successfully');
  })
);

/**
 * GET /api/schedules/:id
 * Get a specific schedule entry
 */
router.get('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid schedule ID format')
  })),
  asyncHandler(async (req, res) => {
    const result = await query(`
      SELECT 
        ps.*,
        u.name as professional_name,
        u.email as professional_email
      FROM professional_schedules ps
      LEFT JOIN users u ON ps.professional_id = u.id
      WHERE ps.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Schedule not found', 404);
    }

    const schedule = result.rows[0];

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
                     req.user.id === schedule.professional_id;

    if (!hasAccess) {
      return errorResponse(res, 'Access denied to this schedule', 403);
    }

    return successResponse(res, schedule, 'Schedule retrieved successfully');
  })
);

/**
 * PUT /api/schedules/:id
 * Update a schedule entry
 */
router.put('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid schedule ID format')
  })),
  validateBody(scheduleUpdateSchema),
  requireRole(['professional', 'admin']),
  asyncHandler(async (req, res) => {
    const scheduleId = req.params.id;
    const updateData = req.body;

    // Get current schedule
    const currentResult = await query(
      'SELECT * FROM professional_schedules WHERE id = $1',
      [scheduleId]
    );

    if (currentResult.rows.length === 0) {
      return errorResponse(res, 'Schedule not found', 404);
    }

    const currentSchedule = currentResult.rows[0];

    // Check permissions
    const canUpdate = req.user.role === 'admin' ||
                     req.user.id === currentSchedule.professional_id;

    if (!canUpdate) {
      return errorResponse(res, 'Access denied to update this schedule', 403);
    }

    // Build update query
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    const allowedFields = [
      'day_of_week', 'start_time', 'end_time', 'is_available',
      'break_start_time', 'break_end_time', 'timezone', 'effective_until'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        params.push(updateData[field]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse(res, 'No valid fields to update', 400);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(scheduleId);

    const updateResult = await query(`
      UPDATE professional_schedules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    const updatedSchedule = updateResult.rows[0];

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: AuditActions.USER_UPDATED,
      resource: 'professional_schedule',
      resourceId: scheduleId,
      details: {
        professionalId: currentSchedule.professional_id,
        changes: updateData,
        oldValues: {
          dayOfWeek: currentSchedule.day_of_week,
          startTime: currentSchedule.start_time,
          endTime: currentSchedule.end_time,
          isAvailable: currentSchedule.is_available
        }
      },
      riskLevel: RiskLevels.LOW,
    });

    logInfo('Professional schedule updated', {
      scheduleId,
      professionalId: currentSchedule.professional_id,
      updatedBy: req.user.id
    });

    return successResponse(res, updatedSchedule, 'Schedule updated successfully');
  })
);

/**
 * DELETE /api/schedules/:id
 * Delete a schedule entry
 */
router.delete('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid schedule ID format')
  })),
  requireRole(['professional', 'admin']),
  asyncHandler(async (req, res) => {
    const scheduleId = req.params.id;

    // Get current schedule
    const currentResult = await query(
      'SELECT * FROM professional_schedules WHERE id = $1',
      [scheduleId]
    );

    if (currentResult.rows.length === 0) {
      return errorResponse(res, 'Schedule not found', 404);
    }

    const currentSchedule = currentResult.rows[0];

    // Check permissions
    const canDelete = req.user.role === 'admin' ||
                     req.user.id === currentSchedule.professional_id;

    if (!canDelete) {
      return errorResponse(res, 'Access denied to delete this schedule', 403);
    }

    // Check for future appointments
    const appointmentsResult = await query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE professional_id = $1
        AND scheduled_date >= CURRENT_DATE
        AND status IN ('scheduled', 'confirmed')
    `, [currentSchedule.professional_id]);

    const futureAppointments = parseInt(appointmentsResult.rows[0].count);

    if (futureAppointments > 0) {
      return errorResponse(res, 
        `Cannot delete schedule. Professional has ${futureAppointments} future appointments.`, 
        400
      );
    }

    // Soft delete by setting effective_until to yesterday
    await query(`
      UPDATE professional_schedules 
      SET effective_until = CURRENT_DATE - INTERVAL '1 day',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [scheduleId]);

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: AuditActions.USER_UPDATED,
      resource: 'professional_schedule',
      resourceId: scheduleId,
      details: {
        professionalId: currentSchedule.professional_id,
        action: 'deleted',
        dayOfWeek: currentSchedule.day_of_week
      },
      riskLevel: RiskLevels.MEDIUM,
    });

    logInfo('Professional schedule deleted', {
      scheduleId,
      professionalId: currentSchedule.professional_id,
      deletedBy: req.user.id
    });

    return noContentResponse(res, 'Schedule deleted successfully');
  })
);

/**
 * POST /api/schedules/exceptions
 * Create a schedule exception
 */
router.post('/exceptions',
  validateBody(exceptionCreateSchema),
  requireRole(['professional', 'admin']),
  asyncHandler(async (req, res) => {
    const exceptionData = req.body;
    const professionalId = req.user.role === 'professional' ? req.user.id : exceptionData.professionalId;

    if (!professionalId) {
      return errorResponse(res, 'Professional ID is required', 400);
    }

    // Verify professional exists
    const professionalResult = await query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [professionalId, 'professional']
    );

    if (professionalResult.rows.length === 0) {
      return errorResponse(res, 'Professional not found', 404);
    }

    // Check for existing exception on the same date
    const existingResult = await query(`
      SELECT * FROM schedule_exceptions 
      WHERE professional_id = $1 AND exception_date = $2
    `, [professionalId, exceptionData.exceptionDate]);

    if (existingResult.rows.length > 0) {
      return errorResponse(res, 'Exception already exists for this date', 409);
    }

    const insertResult = await query(`
      INSERT INTO schedule_exceptions (
        professional_id, title, description, exception_date,
        is_available, start_time, end_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      professionalId,
      exceptionData.title,
      exceptionData.description,
      exceptionData.exceptionDate,
      exceptionData.isAvailable,
      exceptionData.startTime,
      exceptionData.endTime
    ]);

    const exception = insertResult.rows[0];

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: AuditActions.USER_UPDATED,
      resource: 'schedule_exception',
      resourceId: exception.id,
      details: {
        professionalId,
        exceptionDate: exceptionData.exceptionDate,
        title: exceptionData.title,
        isAvailable: exceptionData.isAvailable
      },
      riskLevel: RiskLevels.LOW,
    });

    logInfo('Schedule exception created', {
      exceptionId: exception.id,
      professionalId,
      exceptionDate: exceptionData.exceptionDate,
      createdBy: req.user.id
    });

    return createdResponse(res, exception, 'Schedule exception created successfully');
  })
);

/**
 * GET /api/schedules/exceptions
 * Get schedule exceptions
 */
router.get('/exceptions',
  validateQuery(z.object({
    professionalId: z.string().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    isAvailable: z.coerce.boolean().optional()
  })),
  asyncHandler(async (req, res) => {
    const { professionalId, dateFrom, dateTo, isAvailable } = req.query;

    // Determine which professional's exceptions to fetch
    let targetProfessionalId = professionalId;
    if (req.user.role === 'professional' && !professionalId) {
      targetProfessionalId = req.user.id;
    }

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (targetProfessionalId) {
      whereConditions.push(`se.professional_id = $${paramIndex++}`);
      params.push(targetProfessionalId);
    }

    if (dateFrom) {
      whereConditions.push(`se.exception_date >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`se.exception_date <= $${paramIndex++}`);
      params.push(dateTo);
    }

    if (isAvailable !== undefined) {
      whereConditions.push(`se.is_available = $${paramIndex++}`);
      params.push(isAvailable);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(`
      SELECT 
        se.*,
        u.name as professional_name,
        u.email as professional_email
      FROM schedule_exceptions se
      LEFT JOIN users u ON se.professional_id = u.id
      ${whereClause}
      ORDER BY se.exception_date DESC
    `, params);

    logInfo('Schedule exceptions retrieved', {
      count: result.rows.length,
      professionalId: targetProfessionalId,
      requestedBy: req.user.id
    });

    return successResponse(res, result.rows, 'Schedule exceptions retrieved successfully');
  })
);

/**
 * DELETE /api/schedules/exceptions/:id
 * Delete a schedule exception
 */
router.delete('/exceptions/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid exception ID format')
  })),
  requireRole(['professional', 'admin']),
  asyncHandler(async (req, res) => {
    const exceptionId = req.params.id;

    // Get current exception
    const currentResult = await query(
      'SELECT * FROM schedule_exceptions WHERE id = $1',
      [exceptionId]
    );

    if (currentResult.rows.length === 0) {
      return errorResponse(res, 'Schedule exception not found', 404);
    }

    const currentException = currentResult.rows[0];

    // Check permissions
    const canDelete = req.user.role === 'admin' ||
                     req.user.id === currentException.professional_id;

    if (!canDelete) {
      return errorResponse(res, 'Access denied to delete this exception', 403);
    }

    await query('DELETE FROM schedule_exceptions WHERE id = $1', [exceptionId]);

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: AuditActions.USER_UPDATED,
      resource: 'schedule_exception',
      resourceId: exceptionId,
      details: {
        professionalId: currentException.professional_id,
        action: 'deleted',
        exceptionDate: currentException.exception_date,
        title: currentException.title
      },
      riskLevel: RiskLevels.LOW,
    });

    logInfo('Schedule exception deleted', {
      exceptionId,
      professionalId: currentException.professional_id,
      deletedBy: req.user.id
    });

    return noContentResponse(res, 'Schedule exception deleted successfully');
  })
);

export default router;