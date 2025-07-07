import { query, withTransaction } from '../config/database.js';
import { logInfo, logError, logWarning } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';
import { AppError, ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';

// Create a new appointment
export const createAppointment = async (appointmentData, createdBy) => {
  try {
    logInfo('Creating new appointment', {
      professionalId: appointmentData.professionalId,
      patientId: appointmentData.patientId,
      scheduledDate: appointmentData.scheduledDate,
      createdBy
    });

    const result = await withTransaction(async (client) => {
      // Validate professional exists and is active
      const professionalResult = await client.query(`
        SELECT u.*, p.verified, p.profile_completed 
        FROM users u
        JOIN professionals p ON u.id = p.user_id
        WHERE u.id = $1 AND u.role = 'professional' AND u.status = 'active'
      `, [appointmentData.professionalId]);

      if (professionalResult.rows.length === 0) {
        throw new NotFoundError('Professional not found or inactive');
      }

      const professional = professionalResult.rows[0];
      if (!professional.verified) {
        throw new ValidationError('Professional is not verified');
      }

      // Validate patient exists
      const patientResult = await client.query(`
        SELECT * FROM users 
        WHERE id = $1 AND role = 'patient' AND status = 'active'
      `, [appointmentData.patientId]);

      if (patientResult.rows.length === 0) {
        throw new NotFoundError('Patient not found or inactive');
      }

      // Validate service if provided
      let service = null;
      if (appointmentData.serviceId) {
        const serviceResult = await client.query(`
          SELECT * FROM professional_services 
          WHERE id = $1 AND professional_id = $2 AND is_active = true
        `, [appointmentData.serviceId, appointmentData.professionalId]);

        if (serviceResult.rows.length === 0) {
          throw new NotFoundError('Service not found or inactive');
        }
        service = serviceResult.rows[0];
      }

      // Calculate end time if not provided
      let endTime = appointmentData.endTime;
      if (!endTime && service) {
        const startTime = appointmentData.startTime;
        const duration = service.duration_minutes;
        endTime = addMinutesToTime(startTime, duration);
      } else if (!endTime) {
        endTime = addMinutesToTime(appointmentData.startTime, 30); // Default 30 minutes
      }

      // Check availability
      const isAvailable = await checkAppointmentAvailability(
        client,
        appointmentData.professionalId,
        appointmentData.scheduledDate,
        appointmentData.startTime,
        endTime
      );

      if (!isAvailable) {
        throw new ConflictError('Time slot is not available');
      }

      // Create the appointment
      const insertResult = await client.query(`
        INSERT INTO appointments (
          professional_id, patient_id, service_id, title, description,
          appointment_type, status, scheduled_date, start_time, end_time,
          duration_minutes, is_virtual, location_address, meeting_url,
          fee, currency, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        appointmentData.professionalId,
        appointmentData.patientId,
        appointmentData.serviceId,
        appointmentData.title || 'Medical Appointment',
        appointmentData.description,
        appointmentData.appointmentType || 'consultation',
        appointmentData.status || 'scheduled',
        appointmentData.scheduledDate,
        appointmentData.startTime,
        endTime,
        appointmentData.durationMinutes || service?.duration_minutes || 30,
        appointmentData.isVirtual || false,
        appointmentData.locationAddress,
        appointmentData.meetingUrl,
        appointmentData.fee || service?.base_fee || 0,
        appointmentData.currency || 'EUR',
        appointmentData.notes,
        createdBy
      ]);

      const appointment = insertResult.rows[0];

      // Create audit log
      await createAuditLog({
        userId: createdBy,
        action: AuditActions.APPOINTMENT_CREATED,
        resource: 'appointment',
        resourceId: appointment.id,
        details: {
          professionalId: appointment.professional_id,
          patientId: appointment.patient_id,
          scheduledDate: appointment.scheduled_date,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
          appointmentType: appointment.appointment_type,
          isVirtual: appointment.is_virtual,
          fee: appointment.fee
        },
        riskLevel: RiskLevels.LOW,
      });

      logInfo('Appointment created successfully', {
        appointmentId: appointment.id,
        professionalId: appointment.professional_id,
        patientId: appointment.patient_id,
        createdBy
      });

      return appointment;
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'appointment_creation_failed',
      professionalId: appointmentData.professionalId,
      patientId: appointmentData.patientId,
      createdBy
    });
    throw error;
  }
};

// Get appointments with filtering and pagination
export const getAppointments = async (filters = {}, pagination = {}) => {
  try {
    const {
      professionalId,
      patientId,
      status,
      dateFrom,
      dateTo,
      appointmentType,
      isVirtual
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'scheduled_date',
      sortOrder = 'ASC'
    } = pagination;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (professionalId) {
      whereConditions.push(`a.professional_id = $${paramIndex++}`);
      params.push(professionalId);
    }

    if (patientId) {
      whereConditions.push(`a.patient_id = $${paramIndex++}`);
      params.push(patientId);
    }

    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(`a.status = ANY($${paramIndex++})`);
        params.push(status);
      } else {
        whereConditions.push(`a.status = $${paramIndex++}`);
        params.push(status);
      }
    }

    if (dateFrom) {
      whereConditions.push(`a.scheduled_date >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`a.scheduled_date <= $${paramIndex++}`);
      params.push(dateTo);
    }

    if (appointmentType) {
      whereConditions.push(`a.appointment_type = $${paramIndex++}`);
      params.push(appointmentType);
    }

    if (isVirtual !== undefined) {
      whereConditions.push(`a.is_virtual = $${paramIndex++}`);
      params.push(isVirtual);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Valid sort columns
    const validSortColumns = [
      'scheduled_date', 'start_time', 'end_time', 'created_at', 
      'status', 'appointment_type', 'fee'
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'scheduled_date';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM appointments a
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get appointments with details
    const appointmentsResult = await query(`
      SELECT 
        a.*,
        pp.name as professional_name,
        pp.email as professional_email,
        pt.name as patient_name,
        pt.email as patient_email,
        ps.name as service_name,
        ps.category as service_category,
        ps.description as service_description
      FROM appointments a
      LEFT JOIN users pp ON a.professional_id = pp.id
      LEFT JOIN users pt ON a.patient_id = pt.id
      LEFT JOIN professional_services ps ON a.service_id = ps.id
      ${whereClause}
      ORDER BY a.${sortColumn} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);

    logInfo('Appointments retrieved', {
      total,
      returned: appointmentsResult.rows.length,
      page,
      limit,
      filters
    });

    return {
      appointments: appointmentsResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };

  } catch (error) {
    logError(error, {
      event: 'get_appointments_failed',
      filters,
      pagination
    });
    throw error;
  }
};

// Get single appointment by ID
export const getAppointmentById = async (appointmentId, userId = null) => {
  try {
    const result = await query(`
      SELECT 
        a.*,
        pp.name as professional_name,
        pp.email as professional_email,
        pp.phone as professional_phone,
        pt.name as patient_name,
        pt.email as patient_email,
        pt.phone as patient_phone,
        ps.name as service_name,
        ps.category as service_category,
        ps.description as service_description,
        ps.duration_minutes as service_duration,
        ps.base_fee as service_base_fee
      FROM appointments a
      LEFT JOIN users pp ON a.professional_id = pp.id
      LEFT JOIN users pt ON a.patient_id = pt.id
      LEFT JOIN professional_services ps ON a.service_id = ps.id
      WHERE a.id = $1
    `, [appointmentId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Appointment not found');
    }

    const appointment = result.rows[0];

    // Create audit log for sensitive data access
    if (userId) {
      await createAuditLog({
        userId,
        action: AuditActions.PATIENT_DATA_ACCESS,
        resource: 'appointment',
        resourceId: appointmentId,
        details: {
          appointmentId,
          professionalId: appointment.professional_id,
          patientId: appointment.patient_id,
          accessType: 'view'
        },
        riskLevel: userId === appointment.professional_id || userId === appointment.patient_id 
          ? RiskLevels.LOW 
          : RiskLevels.MEDIUM,
      });
    }

    logInfo('Appointment retrieved', {
      appointmentId,
      userId,
      professionalId: appointment.professional_id,
      patientId: appointment.patient_id
    });

    return appointment;

  } catch (error) {
    logError(error, {
      event: 'get_appointment_failed',
      appointmentId,
      userId
    });
    throw error;
  }
};

// Update appointment
export const updateAppointment = async (appointmentId, updateData, updatedBy) => {
  try {
    logInfo('Updating appointment', {
      appointmentId,
      updatedBy,
      hasScheduleChange: !!(updateData.scheduledDate || updateData.startTime || updateData.endTime)
    });

    const result = await withTransaction(async (client) => {
      // Get current appointment
      const currentResult = await client.query(
        'SELECT * FROM appointments WHERE id = $1',
        [appointmentId]
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Appointment not found');
      }

      const currentAppointment = currentResult.rows[0];

      // Check if schedule is changing and validate availability
      if (updateData.scheduledDate || updateData.startTime || updateData.endTime) {
        const newDate = updateData.scheduledDate || currentAppointment.scheduled_date;
        const newStartTime = updateData.startTime || currentAppointment.start_time;
        const newEndTime = updateData.endTime || currentAppointment.end_time;

        const isAvailable = await checkAppointmentAvailability(
          client,
          currentAppointment.professional_id,
          newDate,
          newStartTime,
          newEndTime,
          appointmentId // Exclude current appointment
        );

        if (!isAvailable) {
          throw new ConflictError('New time slot is not available');
        }
      }

      // Build update query
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = [
        'title', 'description', 'appointment_type', 'status', 'scheduled_date',
        'start_time', 'end_time', 'duration_minutes', 'is_virtual', 
        'location_address', 'meeting_url', 'fee', 'notes', 'internal_notes',
        'cancellation_reason'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex++}`);
          params.push(updateData[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(appointmentId);

      const updateResult = await client.query(`
        UPDATE appointments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, params);

      const updatedAppointment = updateResult.rows[0];

      // Determine change type for audit
      let changeType = AuditActions.APPOINTMENT_UPDATED;
      if (updateData.status === 'cancelled') {
        changeType = AuditActions.APPOINTMENT_CANCELLED;
      } else if (updateData.scheduledDate || updateData.startTime) {
        changeType = AuditActions.APPOINTMENT_UPDATED; // Could be RESCHEDULED
      }

      // Create audit log
      await createAuditLog({
        userId: updatedBy,
        action: changeType,
        resource: 'appointment',
        resourceId: appointmentId,
        details: {
          appointmentId,
          changes: updateData,
          oldValues: {
            status: currentAppointment.status,
            scheduledDate: currentAppointment.scheduled_date,
            startTime: currentAppointment.start_time,
            endTime: currentAppointment.end_time
          },
          newValues: {
            status: updatedAppointment.status,
            scheduledDate: updatedAppointment.scheduled_date,
            startTime: updatedAppointment.start_time,
            endTime: updatedAppointment.end_time
          }
        },
        riskLevel: updateData.status === 'cancelled' ? RiskLevels.MEDIUM : RiskLevels.LOW,
      });

      logInfo('Appointment updated successfully', {
        appointmentId,
        updatedBy,
        changeType,
        status: updatedAppointment.status
      });

      return updatedAppointment;
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'appointment_update_failed',
      appointmentId,
      updatedBy,
      updateData
    });
    throw error;
  }
};

// Cancel appointment
export const cancelAppointment = async (appointmentId, cancellationReason, cancelledBy) => {
  try {
    logInfo('Cancelling appointment', {
      appointmentId,
      cancelledBy,
      reason: cancellationReason
    });

    const result = await updateAppointment(
      appointmentId,
      {
        status: 'cancelled',
        cancellation_reason: cancellationReason
      },
      cancelledBy
    );

    return result;

  } catch (error) {
    logError(error, {
      event: 'appointment_cancellation_failed',
      appointmentId,
      cancelledBy
    });
    throw error;
  }
};

// Check appointment availability
export const checkAppointmentAvailability = async (
  client, 
  professionalId, 
  date, 
  startTime, 
  endTime, 
  excludeAppointmentId = null
) => {
  try {
    // Check for conflicting appointments
    let conflictQuery = `
      SELECT COUNT(*) as conflicts
      FROM appointments
      WHERE professional_id = $1
        AND scheduled_date = $2
        AND status IN ('scheduled', 'confirmed', 'in_progress')
        AND (
          ($3 >= start_time AND $3 < end_time) OR
          ($4 > start_time AND $4 <= end_time) OR
          ($3 <= start_time AND $4 >= end_time)
        )
    `;
    
    let params = [professionalId, date, startTime, endTime];
    
    if (excludeAppointmentId) {
      conflictQuery += ` AND id != $5`;
      params.push(excludeAppointmentId);
    }

    const conflictResult = await client.query(conflictQuery, params);
    const hasConflicts = parseInt(conflictResult.rows[0].conflicts) > 0;

    if (hasConflicts) {
      return false;
    }

    // Check professional schedule
    const dayOfWeek = getDayOfWeek(date);
    const scheduleResult = await client.query(`
      SELECT * FROM professional_schedules
      WHERE professional_id = $1
        AND day_of_week = $2
        AND is_available = true
        AND (effective_until IS NULL OR effective_until >= $3)
        AND effective_from <= $3
    `, [professionalId, dayOfWeek, date]);

    if (scheduleResult.rows.length === 0) {
      return false; // No schedule found for this day
    }

    const schedule = scheduleResult.rows[0];
    
    // Check if appointment time is within schedule
    if (startTime < schedule.start_time || endTime > schedule.end_time) {
      return false;
    }

    // Check if appointment conflicts with break time
    if (schedule.break_start_time && schedule.break_end_time) {
      if (
        (startTime >= schedule.break_start_time && startTime < schedule.break_end_time) ||
        (endTime > schedule.break_start_time && endTime <= schedule.break_end_time) ||
        (startTime <= schedule.break_start_time && endTime >= schedule.break_end_time)
      ) {
        return false;
      }
    }

    // Check for schedule exceptions
    const exceptionResult = await client.query(`
      SELECT * FROM schedule_exceptions
      WHERE professional_id = $1
        AND exception_date = $2
    `, [professionalId, date]);

    if (exceptionResult.rows.length > 0) {
      const exception = exceptionResult.rows[0];
      
      if (!exception.is_available) {
        return false; // Professional is not available this day
      }
      
      // If there are special hours, check them
      if (exception.start_time && exception.end_time) {
        if (startTime < exception.start_time || endTime > exception.end_time) {
          return false;
        }
      }
    }

    return true;

  } catch (error) {
    logError(error, {
      event: 'availability_check_failed',
      professionalId,
      date,
      startTime,
      endTime
    });
    return false;
  }
};

// Get professional availability for a date range
export const getProfessionalAvailability = async (professionalId, dateFrom, dateTo) => {
  try {
    logInfo('Getting professional availability', {
      professionalId,
      dateFrom,
      dateTo
    });

    const availability = {};
    const currentDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = getDayOfWeek(dateStr);

      // Get schedule for this day
      const scheduleResult = await query(`
        SELECT * FROM professional_schedules
        WHERE professional_id = $1
          AND day_of_week = $2
          AND is_available = true
          AND (effective_until IS NULL OR effective_until >= $3)
          AND effective_from <= $3
      `, [professionalId, dayOfWeek, dateStr]);

      if (scheduleResult.rows.length > 0) {
        const schedule = scheduleResult.rows[0];
        
        // Check for exceptions
        const exceptionResult = await query(`
          SELECT * FROM schedule_exceptions
          WHERE professional_id = $1
            AND exception_date = $2
        `, [professionalId, dateStr]);

        let dayAvailability = {
          date: dateStr,
          isAvailable: true,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          breakStartTime: schedule.break_start_time,
          breakEndTime: schedule.break_end_time,
          slots: []
        };

        if (exceptionResult.rows.length > 0) {
          const exception = exceptionResult.rows[0];
          if (!exception.is_available) {
            dayAvailability.isAvailable = false;
            dayAvailability.reason = exception.title;
          } else if (exception.start_time && exception.end_time) {
            dayAvailability.startTime = exception.start_time;
            dayAvailability.endTime = exception.end_time;
          }
        }

        if (dayAvailability.isAvailable) {
          // Get existing appointments for this day
          const appointmentsResult = await query(`
            SELECT start_time, end_time FROM appointments
            WHERE professional_id = $1
              AND scheduled_date = $2
              AND status IN ('scheduled', 'confirmed', 'in_progress')
            ORDER BY start_time
          `, [professionalId, dateStr]);

          // Generate available time slots (30-minute intervals)
          dayAvailability.slots = generateTimeSlots(
            dayAvailability.startTime,
            dayAvailability.endTime,
            dayAvailability.breakStartTime,
            dayAvailability.breakEndTime,
            appointmentsResult.rows,
            30 // Default slot duration
          );
        }

        availability[dateStr] = dayAvailability;
      } else {
        availability[dateStr] = {
          date: dateStr,
          isAvailable: false,
          reason: 'No schedule configured'
        };
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    logInfo('Professional availability retrieved', {
      professionalId,
      daysReturned: Object.keys(availability).length
    });

    return availability;

  } catch (error) {
    logError(error, {
      event: 'get_availability_failed',
      professionalId,
      dateFrom,
      dateTo
    });
    throw error;
  }
};

// Helper functions
const addMinutesToTime = (timeString, minutes) => {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

const getDayOfWeek = (dateString) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const date = new Date(dateString);
  return days[date.getDay()];
};

const generateTimeSlots = (startTime, endTime, breakStart, breakEnd, existingAppointments, slotDuration) => {
  const slots = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const breakStartMin = breakStart ? timeToMinutes(breakStart) : null;
  const breakEndMin = breakEnd ? timeToMinutes(breakEnd) : null;

  for (let time = start; time < end; time += slotDuration) {
    const slotStart = minutesToTime(time);
    const slotEnd = minutesToTime(time + slotDuration);

    // Skip if slot overlaps with break
    if (breakStartMin && breakEndMin && 
        time < breakEndMin && (time + slotDuration) > breakStartMin) {
      continue;
    }

    // Check if slot conflicts with existing appointments
    const hasConflict = existingAppointments.some(apt => {
      const aptStart = timeToMinutes(apt.start_time);
      const aptEnd = timeToMinutes(apt.end_time);
      return time < aptEnd && (time + slotDuration) > aptStart;
    });

    if (!hasConflict) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: true
      });
    }
  }

  return slots;
};

const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export default {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  checkAppointmentAvailability,
  getProfessionalAvailability,
};