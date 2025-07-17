import { query, withTransaction } from '../config/database.js';
import { logInfo, logError, logWarning } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';
import { AppError, ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';

// Create a new professional service
export const createService = async (serviceData, createdBy) => {
  try {
    logInfo('Creating new professional service', {
      professionalId: serviceData.professionalId,
      name: serviceData.name,
      category: serviceData.category,
      createdBy
    });

    const result = await withTransaction(async (client) => {
      // Validate professional exists and is active
      const professionalResult = await client.query(`
        SELECT u.*, p.verified, p.profile_completed 
        FROM users u
        JOIN professionals p ON u.id = p.user_id
        WHERE u.id = $1 AND u.role = 'professional' AND u.status = 'active'
      `, [serviceData.professionalId]);

      if (professionalResult.rows.length === 0) {
        throw new NotFoundError('Professional not found or inactive');
      }

      const professional = professionalResult.rows[0];
      if (!professional.verified) {
        logWarning('Attempt to create service for unverified professional', {
          professionalId: serviceData.professionalId,
          createdBy
        });
        throw new ValidationError('Professional must be verified to create services');
      }

      // Check for duplicate service name for this professional
      const duplicateResult = await client.query(`
        SELECT id FROM professional_services 
        WHERE professional_id = $1 AND LOWER(name) = LOWER($2) AND is_active = true
      `, [serviceData.professionalId, serviceData.name]);

      if (duplicateResult.rows.length > 0) {
        throw new ConflictError('A service with this name already exists for this professional');
      }

      // Create the service
      const insertResult = await client.query(`
        INSERT INTO professional_services (
          professional_id, name, description, category,
          duration_minutes, base_fee, currency,
          is_virtual_available, is_in_person_available,
          requires_preparation, preparation_instructions, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        serviceData.professionalId,
        serviceData.name,
        serviceData.description,
        serviceData.category,
        serviceData.duration_minutes,
        serviceData.base_fee,
        serviceData.currency || 'EUR',
        serviceData.is_virtual_available,
        serviceData.is_in_person_available,
        serviceData.requires_preparation,
        serviceData.preparation_instructions,
        serviceData.is_active
      ]);

      const service = insertResult.rows[0];

      // Create audit log
      await createAuditLog({
        userId: createdBy,
        action: AuditActions.USER_UPDATED,
        resource: 'professional_service',
        resourceId: service.id,
        details: {
          professionalId: service.professional_id,
          serviceName: service.name,
          category: service.category,
          baseFee: service.base_fee,
          durationMinutes: service.duration_minutes,
          isVirtualAvailable: service.is_virtual_available,
          isInPersonAvailable: service.is_in_person_available
        },
        riskLevel: RiskLevels.LOW,
      });

      logInfo('Professional service created successfully', {
        serviceId: service.id,
        professionalId: service.professional_id,
        name: service.name,
        createdBy
      });

      return service;
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'service_creation_failed',
      professionalId: serviceData.professionalId,
      serviceName: serviceData.name,
      createdBy
    });
    throw error;
  }
};

// Get services with filtering and pagination
export const getServices = async (filters = {}, pagination = {}) => {
  try {
    const {
      professionalId,
      category,
      isActive,
      isVirtualAvailable,
      isInPersonAvailable
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = pagination;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (professionalId) {
      whereConditions.push(`ps.professional_id = $${paramIndex++}`);
      params.push(professionalId);
    }

    if (category) {
      whereConditions.push(`ps.category = $${paramIndex++}`);
      params.push(category);
    }

    if (isActive !== undefined) {
      whereConditions.push(`ps.is_active = $${paramIndex++}`);
      params.push(isActive);
    }

    if (isVirtualAvailable !== undefined) {
      whereConditions.push(`ps.is_virtual_available = $${paramIndex++}`);
      params.push(isVirtualAvailable);
    }

    if (isInPersonAvailable !== undefined) {
      whereConditions.push(`ps.is_in_person_available = $${paramIndex++}`);
      params.push(isInPersonAvailable);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Valid sort columns
    const validSortColumns = [
      'name', 'category', 'duration_minutes', 'base_fee', 'created_at'
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM professional_services ps
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get services with professional details
    const servicesResult = await query(`
      SELECT 
        ps.*,
        u.name as professional_name,
        u.email as professional_email,
        p.specialties,
        p.location,
        COUNT(a.id) as total_appointments
      FROM professional_services ps
      LEFT JOIN users u ON ps.professional_id = u.id
      LEFT JOIN professionals p ON ps.professional_id = p.user_id
      LEFT JOIN appointments a ON ps.id = a.service_id
      ${whereClause}
      GROUP BY ps.id, u.name, u.email, p.specialties, p.location
      ORDER BY ps.${sortColumn} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);

    logInfo('Services retrieved', {
      total,
      returned: servicesResult.rows.length,
      page,
      limit,
      filters
    });

    return {
      services: servicesResult.rows,
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
      event: 'get_services_failed',
      filters,
      pagination
    });
    throw error;
  }
};

// Get services by professional ID
export const getServicesByProfessional = async (professionalId, filters = {}) => {
  try {
    const { isActive, category } = filters;

    let whereConditions = [`professional_id = $1`];
    let params = [professionalId];
    let paramIndex = 2;

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const result = await query(`
      SELECT 
        ps.*,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments
      FROM professional_services ps
      LEFT JOIN appointments a ON ps.id = a.service_id
      ${whereClause}
      GROUP BY ps.id
      ORDER BY ps.name ASC
    `, params);

    logInfo('Professional services retrieved', {
      professionalId,
      count: result.rows.length,
      filters
    });

    return result.rows;

  } catch (error) {
    logError(error, {
      event: 'get_professional_services_failed',
      professionalId,
      filters
    });
    throw error;
  }
};

// Get single service by ID
export const getServiceById = async (serviceId) => {
  try {
    const result = await query(`
      SELECT 
        ps.*,
        u.name as professional_name,
        u.email as professional_email,
        u.phone as professional_phone,
        p.specialties,
        p.location,
        p.verified as professional_verified,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        AVG(CASE WHEN a.status = 'completed' THEN a.duration_minutes END) as avg_duration
      FROM professional_services ps
      LEFT JOIN users u ON ps.professional_id = u.id
      LEFT JOIN professionals p ON ps.professional_id = p.user_id
      LEFT JOIN appointments a ON ps.id = a.service_id
      WHERE ps.id = $1
      GROUP BY ps.id, u.name, u.email, u.phone, p.specialties, p.location, p.verified
    `, [serviceId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Service not found');
    }

    const service = result.rows[0];

    logInfo('Service retrieved', {
      serviceId,
      professionalId: service.professional_id,
      name: service.name
    });

    return service;

  } catch (error) {
    logError(error, {
      event: 'get_service_failed',
      serviceId
    });
    throw error;
  }
};

// Update service
export const updateService = async (serviceId, updateData, updatedBy, reason = null) => {
  try {
    logInfo('Updating professional service', {
      serviceId,
      updatedBy,
      hasStatusChange: updateData.is_active !== undefined
    });

    const result = await withTransaction(async (client) => {
      // Get current service
      const currentResult = await client.query(
        'SELECT * FROM professional_services WHERE id = $1',
        [serviceId]
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Service not found');
      }

      const currentService = currentResult.rows[0];

      // Build update query
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = [
        'name', 'description', 'category', 'duration_minutes', 'base_fee',
        'currency', 'is_virtual_available', 'is_in_person_available',
        'requires_preparation', 'preparation_instructions', 'is_active'
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

      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name !== currentService.name) {
        const duplicateResult = await client.query(`
          SELECT id FROM professional_services 
          WHERE professional_id = $1 AND LOWER(name) = LOWER($2) AND id != $3 AND is_active = true
        `, [currentService.professional_id, updateData.name, serviceId]);

        if (duplicateResult.rows.length > 0) {
          throw new ConflictError('A service with this name already exists for this professional');
        }
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(serviceId);

      const updateResult = await client.query(`
        UPDATE professional_services 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, params);

      const updatedService = updateResult.rows[0];

      // Create audit log
      await createAuditLog({
        userId: updatedBy,
        action: AuditActions.USER_UPDATED,
        resource: 'professional_service',
        resourceId: serviceId,
        details: {
          serviceId,
          professionalId: currentService.professional_id,
          changes: updateData,
          oldValues: {
            name: currentService.name,
            category: currentService.category,
            baseFee: currentService.base_fee,
            isActive: currentService.is_active
          },
          newValues: {
            name: updatedService.name,
            category: updatedService.category,
            baseFee: updatedService.base_fee,
            isActive: updatedService.is_active
          },
          reason
        },
        riskLevel: updateData.is_active === false ? RiskLevels.MEDIUM : RiskLevels.LOW,
      });

      logInfo('Professional service updated successfully', {
        serviceId,
        professionalId: currentService.professional_id,
        updatedBy,
        statusChanged: currentService.is_active !== updatedService.is_active
      });

      return updatedService;
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'service_update_failed',
      serviceId,
      updatedBy,
      updateData
    });
    throw error;
  }
};

// Delete service (soft delete by setting is_active to false)
export const deleteService = async (serviceId, deletedBy) => {
  try {
    logInfo('Deleting professional service', {
      serviceId,
      deletedBy
    });

    const result = await withTransaction(async (client) => {
      // Get current service
      const currentResult = await client.query(
        'SELECT * FROM professional_services WHERE id = $1',
        [serviceId]
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Service not found');
      }

      const currentService = currentResult.rows[0];

      // Check for active or future appointments
      const appointmentsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM appointments
        WHERE service_id = $1
          AND scheduled_date >= CURRENT_DATE
          AND status IN ('scheduled', 'confirmed', 'in_progress')
      `, [serviceId]);

      const activeAppointments = parseInt(appointmentsResult.rows[0].count);

      if (activeAppointments > 0) {
        throw new ConflictError(
          `Cannot delete service. There are ${activeAppointments} active or future appointments using this service.`
        );
      }

      // Soft delete by setting is_active to false
      const deleteResult = await client.query(`
        UPDATE professional_services 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [serviceId]);

      // Create audit log
      await createAuditLog({
        userId: deletedBy,
        action: AuditActions.USER_UPDATED,
        resource: 'professional_service',
        resourceId: serviceId,
        details: {
          serviceId,
          professionalId: currentService.professional_id,
          action: 'deleted',
          serviceName: currentService.name,
          category: currentService.category
        },
        riskLevel: RiskLevels.MEDIUM,
      });

      logInfo('Professional service deleted successfully', {
        serviceId,
        professionalId: currentService.professional_id,
        deletedBy
      });

      return deleteResult.rows[0];
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'service_deletion_failed',
      serviceId,
      deletedBy
    });
    throw error;
  }
};

// Get service statistics
export const getServiceStatistics = async (serviceId) => {
  try {
    const result = await query(`
      SELECT 
        ps.id,
        ps.name,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        AVG(CASE WHEN a.status = 'completed' THEN a.duration_minutes END) as avg_duration,
        SUM(CASE WHEN a.status = 'completed' THEN a.fee ELSE 0 END) as total_revenue,
        MIN(a.scheduled_date) as first_appointment_date,
        MAX(a.scheduled_date) as last_appointment_date
      FROM professional_services ps
      LEFT JOIN appointments a ON ps.id = a.service_id
      WHERE ps.id = $1
      GROUP BY ps.id, ps.name
    `, [serviceId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Service not found');
    }

    return result.rows[0];

  } catch (error) {
    logError(error, {
      event: 'get_service_statistics_failed',
      serviceId
    });
    throw error;
  }
};

export default {
  createService,
  getServices,
  getServicesByProfessional,
  getServiceById,
  updateService,
  deleteService,
  getServiceStatistics
};