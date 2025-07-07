import { query, withTransaction } from '../config/database.js';
import { logInfo, logError, logWarning } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';
import { AppError, ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';

// Create a new validation request
export const createValidationRequest = async (requestData, createdBy) => {
  try {
    logInfo('Creating validation request', {
      professionalId: requestData.professionalId,
      documentsCount: requestData.documents.length,
      urgency: requestData.urgency,
      createdBy
    });

    const result = await withTransaction(async (client) => {
      // Validate professional exists and is not already verified
      const professionalResult = await client.query(`
        SELECT u.*, p.verified, p.profile_completed 
        FROM users u
        JOIN professionals p ON u.id = p.user_id
        WHERE u.id = $1 AND u.role = 'professional' AND u.status = 'active'
      `, [requestData.professionalId]);

      if (professionalResult.rows.length === 0) {
        throw new NotFoundError('Professional not found or inactive');
      }

      const professional = professionalResult.rows[0];
      
      // Check if already verified
      if (professional.verified) {
        logWarning('Attempt to create validation request for already verified professional', {
          professionalId: requestData.professionalId,
          createdBy
        });
        throw new ConflictError('Professional is already verified');
      }

      // Check for existing pending request
      const existingResult = await client.query(`
        SELECT id FROM professional_validations 
        WHERE professional_id = $1 AND status IN ('pending', 'under_review', 'requires_more_info')
      `, [requestData.professionalId]);

      if (existingResult.rows.length > 0) {
        throw new ConflictError('Professional already has a pending validation request');
      }

      // Create the validation request
      const insertResult = await client.query(`
        INSERT INTO professional_validations (
          professional_id, status, urgency, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        requestData.professionalId,
        'pending',
        requestData.urgency || 'medium',
        requestData.notes,
        createdBy
      ]);

      const validationRequest = insertResult.rows[0];

      // Insert documents
      for (const doc of requestData.documents) {
        await client.query(`
          INSERT INTO validation_documents (
            validation_id, document_type, filename, description, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          validationRequest.id,
          doc.type,
          doc.filename,
          doc.description,
          createdBy
        ]);
      }

      // Create audit log
      await createAuditLog({
        userId: createdBy,
        action: AuditActions.USER_UPDATED,
        resource: 'validation_request',
        resourceId: validationRequest.id,
        details: {
          professionalId: validationRequest.professional_id,
          urgency: validationRequest.urgency,
          documentsCount: requestData.documents.length,
          documentTypes: requestData.documents.map(d => d.type)
        },
        riskLevel: RiskLevels.MEDIUM,
      });

      logInfo('Validation request created successfully', {
        validationId: validationRequest.id,
        professionalId: validationRequest.professional_id,
        createdBy
      });

      return validationRequest;
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'validation_request_creation_failed',
      professionalId: requestData.professionalId,
      createdBy
    });
    throw error;
  }
};

// Get validation requests with filtering and pagination
export const getValidationRequests = async (filters = {}, pagination = {}) => {
  try {
    const {
      status,
      professionalId,
      urgency,
      dateFrom,
      dateTo
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = pagination;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (status) {
      whereConditions.push(`pv.status = $${paramIndex++}`);
      params.push(status);
    }

    if (professionalId) {
      whereConditions.push(`pv.professional_id = $${paramIndex++}`);
      params.push(professionalId);
    }

    if (urgency) {
      whereConditions.push(`pv.urgency = $${paramIndex++}`);
      params.push(urgency);
    }

    if (dateFrom) {
      whereConditions.push(`pv.created_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`pv.created_at <= $${paramIndex++} + INTERVAL '1 day'`);
      params.push(dateTo);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Valid sort columns
    const validSortColumns = [
      'created_at', 'updated_at', 'status', 'urgency'
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM professional_validations pv
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get validation requests with professional details
    const requestsResult = await query(`
      SELECT 
        pv.*,
        u.name as professional_name,
        u.email as professional_email,
        u.phone as professional_phone,
        p.specialties,
        p.location,
        cb.name as created_by_name,
        rb.name as reviewed_by_name,
        COUNT(vd.id) as documents_count
      FROM professional_validations pv
      LEFT JOIN users u ON pv.professional_id = u.id
      LEFT JOIN professionals p ON pv.professional_id = p.user_id
      LEFT JOIN users cb ON pv.created_by = cb.id
      LEFT JOIN users rb ON pv.reviewed_by = rb.id
      LEFT JOIN validation_documents vd ON pv.id = vd.validation_id
      ${whereClause}
      GROUP BY pv.id, u.name, u.email, u.phone, p.specialties, p.location, cb.name, rb.name
      ORDER BY pv.${sortColumn} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);

    logInfo('Validation requests retrieved', {
      total,
      returned: requestsResult.rows.length,
      page,
      limit,
      filters
    });

    return {
      requests: requestsResult.rows,
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
      event: 'get_validation_requests_failed',
      filters,
      pagination
    });
    throw error;
  }
};

// Get single validation request by ID
export const getValidationRequestById = async (requestId) => {
  try {
    const result = await query(`
      SELECT 
        pv.*,
        u.name as professional_name,
        u.email as professional_email,
        u.phone as professional_phone,
        p.specialties,
        p.location,
        p.verified as professional_verified,
        cb.name as created_by_name,
        rb.name as reviewed_by_name
      FROM professional_validations pv
      LEFT JOIN users u ON pv.professional_id = u.id
      LEFT JOIN professionals p ON pv.professional_id = p.user_id
      LEFT JOIN users cb ON pv.created_by = cb.id
      LEFT JOIN users rb ON pv.reviewed_by = rb.id
      WHERE pv.id = $1
    `, [requestId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Validation request not found');
    }

    const validationRequest = result.rows[0];

    // Get associated documents
    const documentsResult = await query(`
      SELECT 
        vd.*,
        ub.name as uploaded_by_name
      FROM validation_documents vd
      LEFT JOIN users ub ON vd.uploaded_by = ub.id
      WHERE vd.validation_id = $1
      ORDER BY vd.created_at ASC
    `, [requestId]);

    validationRequest.documents = documentsResult.rows;

    logInfo('Validation request retrieved', {
      requestId,
      professionalId: validationRequest.professional_id,
      status: validationRequest.status,
      documentsCount: validationRequest.documents.length
    });

    return validationRequest;

  } catch (error) {
    logError(error, {
      event: 'get_validation_request_failed',
      requestId
    });
    throw error;
  }
};

// Update validation status
export const updateValidationStatus = async (requestId, statusData, reviewedBy) => {
  try {
    logInfo('Updating validation status', {
      requestId,
      newStatus: statusData.status,
      reviewedBy
    });

    const result = await withTransaction(async (client) => {
      // Get current request
      const currentResult = await client.query(
        'SELECT * FROM professional_validations WHERE id = $1',
        [requestId]
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Validation request not found');
      }

      const currentRequest = currentResult.rows[0];

      // Update validation request
      const updateResult = await client.query(`
        UPDATE professional_validations 
        SET 
          status = $1,
          review_notes = $2,
          required_documents = $3,
          reviewed_by = $4,
          reviewed_at = CURRENT_TIMESTAMP,
          expiration_date = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [
        statusData.status,
        statusData.reviewNotes,
        statusData.requiredDocuments ? JSON.stringify(statusData.requiredDocuments) : null,
        reviewedBy,
        statusData.expirationDate,
        requestId
      ]);

      const updatedRequest = updateResult.rows[0];

      // If approved, update professional verification status
      if (statusData.status === 'approved') {
        await client.query(`
          UPDATE professionals 
          SET 
            verified = true,
            verification_date = CURRENT_TIMESTAMP,
            verification_expiry = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [statusData.expirationDate, currentRequest.professional_id]);

        logInfo('Professional verified successfully', {
          professionalId: currentRequest.professional_id,
          reviewedBy
        });
      }

      // Create audit log
      await createAuditLog({
        userId: reviewedBy,
        action: AuditActions.USER_UPDATED,
        resource: 'validation_status',
        resourceId: requestId,
        details: {
          requestId,
          professionalId: currentRequest.professional_id,
          oldStatus: currentRequest.status,
          newStatus: statusData.status,
          reviewNotes: statusData.reviewNotes,
          approved: statusData.status === 'approved'
        },
        riskLevel: statusData.status === 'approved' ? RiskLevels.HIGH : RiskLevels.MEDIUM,
      });

      logInfo('Validation status updated successfully', {
        requestId,
        professionalId: currentRequest.professional_id,
        oldStatus: currentRequest.status,
        newStatus: statusData.status,
        reviewedBy
      });

      return updatedRequest;
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'validation_status_update_failed',
      requestId,
      statusData,
      reviewedBy
    });
    throw error;
  }
};

// Upload additional documents to validation request
export const uploadValidationDocument = async (requestId, documents, uploadedBy) => {
  try {
    logInfo('Uploading validation documents', {
      requestId,
      documentsCount: documents.length,
      uploadedBy
    });

    const result = await withTransaction(async (client) => {
      // Verify validation request exists
      const requestResult = await client.query(
        'SELECT * FROM professional_validations WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new NotFoundError('Validation request not found');
      }

      const validationRequest = requestResult.rows[0];

      // Insert new documents
      for (const doc of documents) {
        await client.query(`
          INSERT INTO validation_documents (
            validation_id, document_type, filename, description, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          requestId,
          doc.type,
          doc.filename,
          doc.description,
          uploadedBy
        ]);
      }

      // Update request timestamp and potentially status
      let newStatus = validationRequest.status;
      if (validationRequest.status === 'requires_more_info') {
        newStatus = 'pending'; // Reset to pending when additional docs are provided
      }

      await client.query(`
        UPDATE professional_validations 
        SET 
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newStatus, requestId]);

      // Create audit log
      await createAuditLog({
        userId: uploadedBy,
        action: AuditActions.USER_UPDATED,
        resource: 'validation_documents',
        resourceId: requestId,
        details: {
          requestId,
          professionalId: validationRequest.professional_id,
          documentsCount: documents.length,
          documentTypes: documents.map(d => d.type),
          statusChange: validationRequest.status !== newStatus
        },
        riskLevel: RiskLevels.MEDIUM,
      });

      logInfo('Validation documents uploaded successfully', {
        requestId,
        professionalId: validationRequest.professional_id,
        documentsCount: documents.length,
        uploadedBy
      });

      // Return updated request
      const updatedResult = await client.query(
        'SELECT * FROM professional_validations WHERE id = $1',
        [requestId]
      );

      return updatedResult.rows[0];
    });

    return result;

  } catch (error) {
    logError(error, {
      event: 'validation_documents_upload_failed',
      requestId,
      documentsCount: documents.length,
      uploadedBy
    });
    throw error;
  }
};

// Get validation history for a professional
export const getValidationHistory = async (professionalId) => {
  try {
    const result = await query(`
      SELECT 
        pv.*,
        rb.name as reviewed_by_name,
        cb.name as created_by_name,
        COUNT(vd.id) as documents_count
      FROM professional_validations pv
      LEFT JOIN users rb ON pv.reviewed_by = rb.id
      LEFT JOIN users cb ON pv.created_by = cb.id
      LEFT JOIN validation_documents vd ON pv.id = vd.validation_id
      WHERE pv.professional_id = $1
      GROUP BY pv.id, rb.name, cb.name
      ORDER BY pv.created_at DESC
    `, [professionalId]);

    logInfo('Validation history retrieved', {
      professionalId,
      requestsCount: result.rows.length
    });

    return result.rows;

  } catch (error) {
    logError(error, {
      event: 'get_validation_history_failed',
      professionalId
    });
    throw error;
  }
};

export default {
  createValidationRequest,
  getValidationRequests,
  getValidationRequestById,
  updateValidationStatus,
  uploadValidationDocument,
  getValidationHistory
};