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
        SELECT u.*, pp.specialty, pp.verified, pp.profile_completed
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        WHERE u.id = $1 AND u.role = 'professional' AND u.status = 'active'
      `, [appointmentData.professionalId]);

      if (professionalResult.rows.length === 0) {
        throw new NotFoundError('Professional not found or inactive');
      }

      const professional = professionalResult.rows[0];
      if (professional.verified === false) {
        throw new ValidationError('Professional is not verified');
      }

      // Validate patient exists - get patient ID from the authenticated user
      const patientResult = await client.query(`
        SELECT u.id, u.name, u.email, u.role, u.status
        FROM users u
        WHERE u.id = $1 AND u.role = 'patient' AND u.status = 'active'
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
      if (!endTime) {
        const [hours, minutes] = appointmentData.startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        const duration = appointmentData.durationMinutes || service?.duration_minutes || 30;
        const endDate = new Date(startDate.getTime() + duration * 60000);
        endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }

      // Check for appointment conflicts
      const conflictResult = await client.query(`
        SELECT id FROM appointments 
        WHERE professional_id = $1 
        AND scheduled_date = $2 
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
      `, [appointmentData.professionalId, appointmentData.scheduledDate, appointmentData.startTime, endTime]);

      if (conflictResult.rows.length > 0) {
        throw new ConflictError('Time slot is not available');
      }

      // Create the appointment using the correct schema
      const insertResult = await client.query(`
        INSERT INTO appointments (
          professional_id, 
          patient_id, 
          service_id,
          title,
          description,
          appointment_type,
          status,
          scheduled_date,
          start_time,
          end_time,
          duration_minutes,
          is_virtual,
          location_address,
          meeting_url,
          notes,
          fee,
          currency,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        appointmentData.professionalId,
        appointmentData.patientId,
        appointmentData.serviceId || null,
        appointmentData.title || 'Consulta Medica',
        appointmentData.description || null,
        appointmentData.appointmentType || 'consultation',
        appointmentData.status || 'scheduled',
        appointmentData.scheduledDate,
        appointmentData.startTime,
        endTime,
        appointmentData.durationMinutes || service?.duration_minutes || 30,
        appointmentData.isVirtual || false,
        appointmentData.locationAddress || null,
        appointmentData.isVirtual ? appointmentData.meetingUrl : null,
        appointmentData.notes || null,
        appointmentData.fee || service?.price || 0,
        appointmentData.currency || 'EUR',
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
          fee: appointment.fee,
          status: appointment.status
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

    // Build WHERE conditions
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (professionalId) {
      whereConditions.push(`a.professional_id = $${paramIndex}`);
      queryParams.push(professionalId);
      paramIndex++;
    }

    if (patientId) {
      whereConditions.push(`a.patient_id = $${paramIndex}`);
      queryParams.push(patientId);
      paramIndex++;
    }

    if (status) {
      if (Array.isArray(status)) {
        const statusPlaceholders = status.map(() => `$${paramIndex++}`).join(',');
        whereConditions.push(`a.status IN (${statusPlaceholders})`);
        queryParams.push(...status);
      } else {
        whereConditions.push(`a.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
    }

    if (dateFrom) {
      whereConditions.push(`a.scheduled_date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`a.scheduled_date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (appointmentType) {
      whereConditions.push(`a.appointment_type = $${paramIndex}`);
      queryParams.push(appointmentType);
      paramIndex++;
    }

    if (isVirtual !== undefined) {
      whereConditions.push(`a.is_virtual = $${paramIndex}`);
      queryParams.push(isVirtual);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Main query
    const appointmentsQuery = `
      SELECT 
        a.*,
        u_prof.name as professional_name,
        u_prof.avatar_url as professional_image,
        u_patient.name as patient_name,
        u_patient.avatar_url as patient_image,
        pp.specialty,
        pp.office_address,
        pp.office_phone,
        ps.name as service_name,
        ps.price as service_price,
        ps.duration_minutes as service_duration
      FROM appointments a
      JOIN users u_prof ON a.professional_id = u_prof.id
      JOIN users u_patient ON a.patient_id = u_patient.id
      LEFT JOIN professional_profiles pp ON u_prof.id = pp.user_id
      LEFT JOIN professional_services ps ON a.service_id = ps.id
      ${whereClause}
      ORDER BY a.${sortBy} ${sortOrder}, a.start_time ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await query(appointmentsQuery, queryParams);

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);

    return {
      appointments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

  } catch (error) {
    logError('Error fetching appointments:', error);
    throw error;
  }
};

// Get appointment by ID
export const getAppointmentById = async (appointmentId, userId = null) => {
  try {
    const appointmentQuery = `
      SELECT 
        a.*,
        u_prof.name as professional_name,
        u_prof.avatar_url as professional_image,
        u_prof.email as professional_email,
        u_patient.name as patient_name,
        u_patient.avatar_url as patient_image,
        u_patient.email as patient_email,
        pp.specialty,
        pp.office_address,
        pp.office_phone,
        ps.name as service_name,
        ps.price as service_price,
        ps.duration_minutes as service_duration
      FROM appointments a
      JOIN users u_prof ON a.professional_id = u_prof.id
      JOIN users u_patient ON a.patient_id = u_patient.id
      LEFT JOIN professional_profiles pp ON u_prof.id = pp.user_id
      LEFT JOIN professional_services ps ON a.service_id = ps.id
      WHERE a.id = $1
    `;

    const result = await query(appointmentQuery, [appointmentId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Appointment not found');
    }

    const appointment = result.rows[0];

    // Create audit log if userId is provided
    if (userId) {
      await createAuditLog({
        userId,
        action: AuditActions.PATIENT_DATA_ACCESS,
        resource: 'appointment',
        resourceId: appointmentId,
        details: {
          appointmentId,
          professionalId: appointment.professional_id,
          patientId: appointment.patient_id
        },
        riskLevel: RiskLevels.LOW
      });
    }

    return appointment;

  } catch (error) {
    logError('Error fetching appointment by ID:', error);
    throw error;
  }
};

// Update appointment
export const updateAppointment = async (appointmentId, updateData, updatedBy) => {
  try {
    const result = await withTransaction(async (client) => {
      // Get current appointment
      const currentResult = await client.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
      
      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Appointment not found');
      }

      const currentAppointment = currentResult.rows[0];

      // Build update query
      const updateFields = [];
      const queryParams = [appointmentId];
      let paramIndex = 2;

      const allowedFields = [
        'title', 'description', 'appointment_type', 'scheduled_date', 'start_time', 
        'end_time', 'duration_minutes', 'status', 'is_virtual', 'location_address', 
        'meeting_url', 'notes', 'internal_notes', 'cancellation_reason', 'fee',
        'patient_symptoms', 'diagnosis', 'treatment_plan', 'prescriptions'
      ];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      // Add updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE appointments 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, queryParams);
      const updatedAppointment = updateResult.rows[0];

      // Create audit log
      await createAuditLog({
        userId: updatedBy,
        action: AuditActions.APPOINTMENT_UPDATED,
        resource: 'appointment',
        resourceId: appointmentId,
        details: {
          appointmentId,
          changes: updateData,
          previousStatus: currentAppointment.status,
          newStatus: updatedAppointment.status
        },
        riskLevel: RiskLevels.MEDIUM
      });

      return updatedAppointment;
    });

    return result;

  } catch (error) {
    logError('Error updating appointment:', error);
    throw error;
  }
};

// Cancel appointment
export const cancelAppointment = async (appointmentId, reason, cancelledBy) => {
  try {
    const updateData = {
      status: 'cancelled',
      cancellation_reason: reason
    };

    const cancelledAppointment = await updateAppointment(appointmentId, updateData, cancelledBy);

    // Additional audit log for cancellation
    await createAuditLog({
      userId: cancelledBy,
      action: AuditActions.APPOINTMENT_CANCELLED,
      resource: 'appointment',
      resourceId: appointmentId,
      details: {
        appointmentId,
        reason,
        cancelledAt: new Date().toISOString()
      },
      riskLevel: RiskLevels.MEDIUM
    });

    return cancelledAppointment;

  } catch (error) {
    logError('Error cancelling appointment:', error);
    throw error;
  }
};

// Get professional availability
export const getProfessionalAvailability = async (professionalId, dateFrom, dateTo) => {
  try {
    // Get professional schedule
    const scheduleQuery = `
      SELECT * FROM professional_schedules 
      WHERE professional_id = $1 
      AND (effective_until IS NULL OR effective_until >= $2)
      AND effective_from <= $3
      ORDER BY day_of_week, start_time
    `;

    const scheduleResult = await query(scheduleQuery, [professionalId, dateFrom, dateTo]);

    // Get existing appointments
    const appointmentsQuery = `
      SELECT scheduled_date, start_time, end_time, status
      FROM appointments 
      WHERE professional_id = $1 
      AND scheduled_date BETWEEN $2 AND $3
      AND status NOT IN ('cancelled', 'no_show')
      ORDER BY scheduled_date, start_time
    `;

    const appointmentsResult = await query(appointmentsQuery, [professionalId, dateFrom, dateTo]);

    // Get schedule exceptions
    const exceptionsQuery = `
      SELECT exception_date, is_available, start_time, end_time
      FROM schedule_exceptions 
      WHERE professional_id = $1 
      AND exception_date BETWEEN $2 AND $3
      ORDER BY exception_date
    `;

    const exceptionsResult = await query(exceptionsQuery, [professionalId, dateFrom, dateTo]);

    return {
      schedule: scheduleResult.rows,
      appointments: appointmentsResult.rows,
      exceptions: exceptionsResult.rows
    };

  } catch (error) {
    logError('Error fetching professional availability:', error);
    throw error;
  }
};

export default {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getProfessionalAvailability
};