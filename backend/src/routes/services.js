import express from 'express';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, createdResponse, errorResponse, noContentResponse, paginatedResponse } from '../utils/responses.js';
import { 
  createService, 
  getServices, 
  getServiceById, 
  updateService, 
  deleteService,
  getServicesByProfessional 
} from '../services/serviceService.js';
import { z } from 'zod';
import { auditMiddleware, AuditActions, RiskLevels } from '../utils/auditLog.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);
router.use(attachUser);

// Validation schemas
const serviceCreateSchema = z.object({
  name: z.string().min(1).max(255, 'Service name is required'),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(100, 'Category is required'),
  duration_minutes: z.number().int().min(15).max(480, 'Duration must be between 15 and 480 minutes'),
  base_fee: z.number().min(0, 'Fee must be non-negative'),
  currency: z.string().length(3).default('EUR'),
  is_virtual_available: z.boolean().default(true),
  is_in_person_available: z.boolean().default(true),
  requires_preparation: z.boolean().default(false),
  preparation_instructions: z.string().max(1000).optional(),
  is_active: z.boolean().default(true)
}).refine(data => {
  // At least one modality must be available
  return data.is_virtual_available || data.is_in_person_available;
}, {
  message: 'At least one modality (virtual or in-person) must be available',
  path: ['is_virtual_available']
});

const serviceUpdateSchema = serviceCreateSchema.partial();

const serviceQuerySchema = z.object({
  professionalId: z.string().optional(),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isVirtualAvailable: z.coerce.boolean().optional(),
  isInPersonAvailable: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'category', 'duration_minutes', 'base_fee', 'created_at']).default('name'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC')
});

/**
 * POST /api/services
 * Create a new professional service
 */
router.post('/',
  validateBody(serviceCreateSchema),
  requireRole(['professional', 'admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'professional_service',
    riskLevel: RiskLevels.LOW
  }),
  asyncHandler(async (req, res) => {
    const serviceData = {
      ...req.body,
      professionalId: req.user.role === 'professional' ? req.user.id : req.body.professionalId
    };

    if (!serviceData.professionalId) {
      return errorResponse(res, 'Professional ID is required', 400);
    }

    // Professionals can only create services for themselves
    if (req.user.role === 'professional' && serviceData.professionalId !== req.user.id) {
      return errorResponse(res, 'Professionals can only create services for themselves', 403);
    }

    const service = await createService(serviceData, req.user.id);
    
    return createdResponse(res, service, 'Service created successfully');
  })
);

/**
 * GET /api/services
 * Get services with filtering and pagination
 */
router.get('/',
  validateQuery(serviceQuerySchema),
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
      // Professionals can only see their own services unless specified
      if (!filters.professionalId) {
        filters.professionalId = req.user.id;
      } else if (filters.professionalId !== req.user.id) {
        return errorResponse(res, 'Professionals can only view their own services', 403);
      }
    }
    // Patients and admins can view all services

    // Remove pagination fields from filters
    delete filters.page;
    delete filters.limit;
    delete filters.sortBy;
    delete filters.sortOrder;

    const result = await getServices(filters, pagination);
    
    return paginatedResponse(res, result.services, result.pagination, 'Services retrieved successfully');
  })
);

/**
 * GET /api/services/professional/:professionalId
 * Get all services for a specific professional (public endpoint for patients)
 */
router.get('/professional/:professionalId',
  validateParams(z.object({
    professionalId: z.string().min(1, 'Professional ID is required')
  })),
  validateQuery(z.object({
    includeInactive: z.coerce.boolean().default(false),
    category: z.string().optional()
  })),
  asyncHandler(async (req, res) => {
    const { professionalId } = req.params;
    const { includeInactive, category } = req.query;

    // Patients can only see active services unless they're the professional or admin
    const canViewInactive = req.user.role === 'admin' || 
                           req.user.id === professionalId ||
                           req.user.role === 'professional';

    const filters = {
      professionalId,
      isActive: canViewInactive ? undefined : true
    };

    if (category) {
      filters.category = category;
    }

    if (includeInactive && !canViewInactive) {
      return errorResponse(res, 'Access denied to view inactive services', 403);
    }

    const result = await getServicesByProfessional(professionalId, filters);
    
    return successResponse(res, result, 'Professional services retrieved successfully');
  })
);

/**
 * GET /api/services/:id
 * Get a specific service by ID
 */
router.get('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid service ID format')
  })),
  asyncHandler(async (req, res) => {
    const service = await getServiceById(req.params.id);
    
    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
                     req.user.id === service.professional_id ||
                     (req.user.role === 'patient' && service.is_active);

    if (!hasAccess) {
      return errorResponse(res, 'Access denied to this service', 403);
    }

    return successResponse(res, service, 'Service retrieved successfully');
  })
);

/**
 * PUT /api/services/:id
 * Update a service
 */
router.put('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid service ID format')
  })),
  validateBody(serviceUpdateSchema),
  requireRole(['professional', 'admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'professional_service',
    riskLevel: RiskLevels.LOW,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const serviceId = req.params.id;
    
    // Get current service to check permissions
    const currentService = await getServiceById(serviceId);
    
    const canUpdate = req.user.role === 'admin' ||
                     req.user.id === currentService.professional_id;

    if (!canUpdate) {
      return errorResponse(res, 'Access denied to update this service', 403);
    }

    const updatedService = await updateService(serviceId, req.body, req.user.id);
    
    return successResponse(res, updatedService, 'Service updated successfully');
  })
);

/**
 * DELETE /api/services/:id
 * Delete (soft delete) a service
 */
router.delete('/:id',
  validateParams(z.object({
    id: z.string().uuid('Invalid service ID format')
  })),
  requireRole(['professional', 'admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'professional_service',
    riskLevel: RiskLevels.MEDIUM,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const serviceId = req.params.id;
    
    // Get current service to check permissions
    const currentService = await getServiceById(serviceId);
    
    const canDelete = req.user.role === 'admin' ||
                     req.user.id === currentService.professional_id;

    if (!canDelete) {
      return errorResponse(res, 'Access denied to delete this service', 403);
    }

    // Check if service is being used in appointments
    const hasActiveAppointments = await checkServiceInUse(serviceId);
    
    if (hasActiveAppointments) {
      return errorResponse(res, 
        'Cannot delete service that has active or future appointments. Consider deactivating instead.', 
        400
      );
    }

    await deleteService(serviceId, req.user.id);
    
    return noContentResponse(res, 'Service deleted successfully');
  })
);

/**
 * PATCH /api/services/:id/status
 * Activate/Deactivate a service
 */
router.patch('/:id/status',
  validateParams(z.object({
    id: z.string().uuid('Invalid service ID format')
  })),
  validateBody(z.object({
    isActive: z.boolean(),
    reason: z.string().max(500).optional()
  })),
  requireRole(['professional', 'admin']),
  auditMiddleware({
    action: AuditActions.USER_UPDATED,
    resource: 'professional_service_status',
    riskLevel: RiskLevels.LOW,
    extractResourceId: (req) => req.params.id
  }),
  asyncHandler(async (req, res) => {
    const serviceId = req.params.id;
    const { isActive, reason } = req.body;
    
    // Get current service to check permissions
    const currentService = await getServiceById(serviceId);
    
    const canUpdate = req.user.role === 'admin' ||
                     req.user.id === currentService.professional_id;

    if (!canUpdate) {
      return errorResponse(res, 'Access denied to update this service status', 403);
    }

    const updatedService = await updateService(
      serviceId, 
      { is_active: isActive }, 
      req.user.id,
      reason
    );
    
    return successResponse(
      res, 
      updatedService, 
      `Service ${isActive ? 'activated' : 'deactivated'} successfully`
    );
  })
);

// Helper function to check if service is in use
const checkServiceInUse = async (serviceId) => {
  const { query } = await import('../config/database.js');
  
  const result = await query(`
    SELECT COUNT(*) as count
    FROM appointments
    WHERE service_id = $1
      AND scheduled_date >= CURRENT_DATE
      AND status IN ('scheduled', 'confirmed', 'in_progress')
  `, [serviceId]);
  
  return parseInt(result.rows[0].count) > 0;
};

export default router;