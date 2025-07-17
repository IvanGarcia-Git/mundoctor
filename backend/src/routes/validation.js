import express from 'express';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, createdResponse, errorResponse, paginatedResponse } from '../utils/responses.js';
import { 
  createValidationRequest,
  getValidationRequests,
  getValidationRequestById,
  updateValidationStatus,
  uploadValidationDocument,
  getValidationHistory
} from '../services/validationService.js';
import { z } from 'zod';
import { auditMiddleware, AuditActions, RiskLevels } from '../utils/auditLog.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);
router.use(attachUser);

// Validation schemas
const validationRequestSchema = z.object({
  documents: z.array(z.object({
    type: z.enum(['medical_license', 'cedula', 'specialty_certificate', 'cv', 'other']),
    filename: z.string().min(1),
    description: z.string().max(500).optional()
  })).min(1, 'At least one document is required'),
  notes: z.string().max(1000).optional(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium')
});

const validationStatusSchema = z.object({
  status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'requires_more_info']),
  reviewNotes: z.string().max(2000).optional(),
  requiredDocuments: z.array(z.string()).optional(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const validationQuerySchema = z.object({
  status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'requires_more_info']).optional(),
  professionalId: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'updated_at', 'status', 'urgency']).default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC')
});

/**
 * POST /api/validation/request
 * Create a new validation request (Professional only)
 */
router.post('/request',
  validateBody(validationRequestSchema),
  requireRole(['professional']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'validation_request',
    riskLevel: RiskLevels.MEDIUM
  }),
  asyncHandler(async (req, res) => {
    const requestData = {
      ...req.body,
      professionalId: req.user.id
    };

    const validationRequest = await createValidationRequest(requestData, req.user.id);
    
    return createdResponse(res, validationRequest, 'Validation request created successfully');
  })
);

/**
 * GET /api/validation/requests
 * Get validation requests with filtering
 */
router.get('/requests',
  validateQuery(validationQuerySchema),
  asyncHandler(async (req, res) => {
    const filters = { ...req.query };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    // Apply role-based filtering
    if (req.user.role === 'professional') {
      // Professionals can only see their own requests
      filters.professionalId = req.user.id;
    } else if (req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied to validation requests', 403);
    }
    // Admins can see all requests

    // Remove pagination fields from filters
    delete filters.page;
    delete filters.limit;
    delete filters.sortBy;
    delete filters.sortOrder;

    const result = await getValidationRequests(filters, pagination);
    
    return paginatedResponse(res, result.requests, result.pagination, 'Validation requests retrieved successfully');
  })
);

/**
 * GET /api/validation/pending
 * Get pending validation requests (Admin only)
 */
router.get('/pending',
  requireRole(['admin']),
  validateQuery(z.object({
    urgency: z.enum(['low', 'medium', 'high']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50)
  })),
  asyncHandler(async (req, res) => {
    const filters = {
      status: 'pending',
      urgency: req.query.urgency
    };

    const pagination = {
      page: 1,
      limit: req.query.limit,
      sortBy: 'created_at',
      sortOrder: 'ASC' // Oldest first for pending
    };

    const result = await getValidationRequests(filters, pagination);
    
    return successResponse(res, result.requests, `${result.requests.length} pending validation requests found`);
  })
);

/**
 * GET /api/validation/requests/:id
 * Get a specific validation request
 */
router.get('/requests/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid validation request ID format')
  })),
  auditMiddleware({
    action: AuditActions.PATIENT_DATA_ACCESS,
    resource: 'validation_request',
    riskLevel: RiskLevels.MEDIUM,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const validationRequest = await getValidationRequestById(req.params.id);
    
    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
                     req.user.id === validationRequest.professional_id;

    if (!hasAccess) {
      return errorResponse(res, 'Access denied to this validation request', 403);
    }

    return successResponse(res, validationRequest, 'Validation request retrieved successfully');
  })
);

/**
 * PUT /api/validation/:id/status
 * Update validation request status (Admin only)
 */
router.put('/:id/status',
  validateParams(z.object({
    id: z.string().uuid('Invalid validation request ID format')
  })),
  validateBody(validationStatusSchema),
  requireRole(['admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'validation_status',
    riskLevel: RiskLevels.HIGH,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const statusData = req.body;

    const updatedRequest = await updateValidationStatus(requestId, statusData, req.user.id);
    
    return successResponse(res, updatedRequest, 'Validation status updated successfully');
  })
);

/**
 * POST /api/validation/:id/approve
 * Approve a validation request (Admin only)
 */
router.post('/:id/approve',
  validateParams(z.object({
    id: z.string().uuid('Invalid validation request ID format')
  })),
  validateBody(z.object({
    reviewNotes: z.string().max(2000).optional(),
    expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })),
  requireRole(['admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'validation_approval',
    riskLevel: RiskLevels.HIGH,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const { reviewNotes, expirationDate } = req.body;

    const statusData = {
      status: 'approved',
      reviewNotes,
      expirationDate
    };

    const updatedRequest = await updateValidationStatus(requestId, statusData, req.user.id);
    
    return successResponse(res, updatedRequest, 'Professional validation approved successfully');
  })
);

/**
 * POST /api/validation/:id/reject
 * Reject a validation request (Admin only)
 */
router.post('/:id/reject',
  validateParams(z.object({
    id: z.string().uuid('Invalid validation request ID format')
  })),
  validateBody(z.object({
    reviewNotes: z.string().min(10).max(2000, 'Rejection reason is required'),
    requiredDocuments: z.array(z.string()).optional()
  })),
  requireRole(['admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'validation_rejection',
    riskLevel: RiskLevels.HIGH,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const { reviewNotes, requiredDocuments } = req.body;

    const statusData = {
      status: 'rejected',
      reviewNotes,
      requiredDocuments
    };

    const updatedRequest = await updateValidationStatus(requestId, statusData, req.user.id);
    
    return successResponse(res, updatedRequest, 'Professional validation rejected');
  })
);

/**
 * POST /api/validation/:id/request-info
 * Request more information from professional (Admin only)
 */
router.post('/:id/request-info',
  validateParams(z.object({
    id: z.string().uuid('Invalid validation request ID format')
  })),
  validateBody(z.object({
    reviewNotes: z.string().min(10).max(2000, 'Information request details are required'),
    requiredDocuments: z.array(z.string()).min(1, 'At least one required document must be specified')
  })),
  requireRole(['admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'validation_info_request',
    riskLevel: RiskLevels.MEDIUM,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const { reviewNotes, requiredDocuments } = req.body;

    const statusData = {
      status: 'requires_more_info',
      reviewNotes,
      requiredDocuments
    };

    const updatedRequest = await updateValidationStatus(requestId, statusData, req.user.id);
    
    return successResponse(res, updatedRequest, 'Additional information requested from professional');
  })
);

/**
 * POST /api/validation/:id/documents
 * Upload additional documents to validation request
 */
router.post('/:id/documents',
  validateParams(z.object({
    id: z.string().uuid('Invalid validation request ID format')
  })),
  validateBody(z.object({
    documents: z.array(z.object({
      type: z.enum(['medical_license', 'cedula', 'specialty_certificate', 'cv', 'other']),
      filename: z.string().min(1),
      description: z.string().max(500).optional()
    })).min(1, 'At least one document is required')
  })),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'validation_documents',
    riskLevel: RiskLevels.MEDIUM,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const { documents } = req.body;

    // Get current request to check permissions
    const currentRequest = await getValidationRequestById(requestId);
    
    const canUpload = req.user.role === 'admin' ||
                     req.user.id === currentRequest.professional_id;

    if (!canUpload) {
      return errorResponse(res, 'Access denied to upload documents to this request', 403);
    }

    const updatedRequest = await uploadValidationDocument(requestId, documents, req.user.id);
    
    return successResponse(res, updatedRequest, 'Documents uploaded successfully');
  })
);

/**
 * GET /api/validation/history/:professionalId
 * Get validation history for a professional
 */
router.get('/history/:professionalId',
  validateParams(z.object({
    professionalId: z.string().min(1, 'Professional ID is required')
  })),
  asyncHandler(async (req, res) => {
    const { professionalId } = req.params;
    
    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
                     req.user.id === professionalId;

    if (!hasAccess) {
      return errorResponse(res, 'Access denied to view validation history', 403);
    }

    const history = await getValidationHistory(professionalId);
    
    return successResponse(res, history, 'Validation history retrieved successfully');
  })
);

/**
 * GET /api/validation/stats
 * Get validation statistics (Admin only)
 */
router.get('/stats',
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { query } = await import('../config/database.js');
    
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'requires_more_info' THEN 1 END) as requires_info_count,
        AVG(CASE WHEN status IN ('approved', 'rejected') 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))/86400 
            END) as avg_processing_days
      FROM professional_validations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const urgencyStatsResult = await query(`
      SELECT 
        urgency,
        COUNT(*) as count,
        AVG(CASE WHEN status IN ('approved', 'rejected') 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))/86400 
            END) as avg_days
      FROM professional_validations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status = 'pending'
      GROUP BY urgency
    `);

    const stats = {
      summary: statsResult.rows[0],
      urgencyBreakdown: urgencyStatsResult.rows,
      period: 'Last 30 days'
    };
    
    return successResponse(res, stats, 'Validation statistics retrieved successfully');
  })
);

export default router;