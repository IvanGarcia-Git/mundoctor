import express from 'express';
import reviewService from '../services/reviewService.js';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import {
  validateCreateReview,
  validateUpdateReview,
  validateReviewId,
  validateProfessionalId,
  validateReviewFilters,
  validateProfessionalReviewsPagination,
  validateReviewStatsFilters,
  validateReviewLegitimacy,
  checkReviewPermissions,
  checkModerationPermissions
} from '../validators/reviewValidator.js';
import { createAuditLog } from '../utils/auditLog.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responses.js';

const router = express.Router();

// Middleware para autenticación en todas las rutas
router.use(requireAuth);

// POST /api/reviews - Crear reseña
router.post('/', validateCreateReview, checkReviewPermissions(['patient']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { professionalId, appointmentId, rating, comment } = req.body;
    
    // Validar legitimidad de la reseña
    const legitimacy = await reviewService.validateReviewLegitimacy(userId, professionalId, appointmentId);
    
    if (!legitimacy.valid) {
      return errorResponse(res, 400, legitimacy.reason);
    }
    
    // Moderar contenido si hay comentario
    if (comment) {
      const moderation = await reviewService.moderateReviewContent(comment);
      if (!moderation.approved) {
        return errorResponse(res, 400, moderation.reason, { details: moderation });
      }
    }
    
    const reviewData = {
      patientId: userId,
      professionalId,
      appointmentId,
      rating,
      comment
    };
    
    const review = await reviewService.createReview(reviewData);
    
    await createAuditLog({
      userId,
      action: 'review_created',
      resource: 'reviews',
      resourceId: review.id,
      details: { 
        professionalId,
        appointmentId,
        rating,
        hasComment: !!comment
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    createdResponse(res, review, 'Reseña creada correctamente');
  } catch (error) {
    console.error('Error al crear reseña:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/reviews - Listar reseñas con filtros
router.get('/', validateReviewFilters, async (req, res) => {
  try {
    const userId = req.user.id;
    const { professionalId, patientId, minRating, maxRating, limit = 10, offset = 0 } = req.query;
    
    const filters = {
      professionalId,
      patientId,
      minRating: minRating ? parseInt(minRating) : undefined,
      maxRating: maxRating ? parseInt(maxRating) : undefined
    };
    
    const pagination = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const results = await reviewService.getReviews(filters, pagination);
    
    await createAuditLog({
      userId,
      action: 'reviews_accessed',
      resource: 'reviews',
      details: { filters, resultsCount: results.reviews.length },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, results, 'Reseñas obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener reseñas:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/reviews/:id - Obtener reseña específica
router.get('/:id', validateReviewId, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const review = await reviewService.getReviewById(id);
    
    if (!review) {
      return errorResponse(res, 404, 'Reseña no encontrada');
    }
    
    await createAuditLog({
      userId,
      action: 'review_accessed',
      resource: 'reviews',
      resourceId: id,
      details: { reviewId: id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, review, 'Reseña obtenida correctamente');
  } catch (error) {
    console.error('Error al obtener reseña:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// PUT /api/reviews/:id - Actualizar reseña
router.put('/:id', validateUpdateReview, checkReviewPermissions(['patient']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;
    
    // Moderar contenido si se actualiza el comentario
    if (updates.comment) {
      const moderation = await reviewService.moderateReviewContent(updates.comment);
      if (!moderation.approved) {
        return errorResponse(res, 400, moderation.reason, { details: moderation });
      }
    }
    
    const updatedReview = await reviewService.updateReview(id, userId, updates);
    
    await createAuditLog({
      userId,
      action: 'review_updated',
      resource: 'reviews',
      resourceId: id,
      details: { 
        reviewId: id,
        changes: Object.keys(updates)
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, updatedReview, 'Reseña actualizada correctamente');
  } catch (error) {
    console.error('Error al actualizar reseña:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// DELETE /api/reviews/:id - Eliminar reseña
router.delete('/:id', validateReviewId, checkReviewPermissions(['patient']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    await reviewService.deleteReview(id, userId);
    
    await createAuditLog({
      userId,
      action: 'review_deleted',
      resource: 'reviews',
      resourceId: id,
      details: { reviewId: id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, null, 'Reseña eliminada correctamente');
  } catch (error) {
    console.error('Error al eliminar reseña:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/reviews/professional/:id - Obtener reseñas de un profesional
router.get('/professional/:id', validateProfessionalReviewsPagination, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: professionalId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const pagination = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const results = await reviewService.getProfessionalReviews(professionalId, pagination);
    
    await createAuditLog({
      userId,
      action: 'professional_reviews_accessed',
      resource: 'reviews',
      details: { 
        professionalId,
        resultsCount: results.reviews.length,
        averageRating: results.statistics.average_rating
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, results, 'Reseñas del profesional obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener reseñas del profesional:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/reviews/stats - Obtener estadísticas de reseñas
router.get('/stats', validateReviewStatsFilters, async (req, res) => {
  try {
    const userId = req.user.id;
    const { professionalId, dateFrom, dateTo } = req.query;
    
    const filters = {
      professionalId,
      dateFrom,
      dateTo
    };
    
    const statistics = await reviewService.getReviewStatistics(filters);
    
    await createAuditLog({
      userId,
      action: 'review_statistics_accessed',
      resource: 'reviews',
      details: { 
        filters,
        totalReviews: statistics.total_reviews,
        averageRating: statistics.average_rating
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, statistics, 'Estadísticas de reseñas obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/reviews/validate-legitimacy - Validar legitimidad de reseña
router.post('/validate-legitimacy', validateReviewLegitimacy, checkReviewPermissions(['patient']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { professionalId, appointmentId } = req.body;
    
    const legitimacy = await reviewService.validateReviewLegitimacy(userId, professionalId, appointmentId);
    
    await createAuditLog({
      userId,
      action: 'review_legitimacy_checked',
      resource: 'reviews',
      details: { 
        professionalId,
        appointmentId,
        valid: legitimacy.valid,
        reason: legitimacy.reason
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, legitimacy, 'Validación de legitimidad completada');
  } catch (error) {
    console.error('Error al validar legitimidad:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/reviews/moderate-content - Moderar contenido de reseña (solo para admins)
router.post('/moderate-content', checkModerationPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const { comment } = req.body;
    
    if (!comment) {
      return errorResponse(res, 400, 'Se requiere el comentario para moderar');
    }
    
    const moderation = await reviewService.moderateReviewContent(comment);
    
    await createAuditLog({
      userId,
      action: 'content_moderated',
      resource: 'reviews',
      details: { 
        approved: moderation.approved,
        reason: moderation.reason,
        flaggedWords: moderation.flagged_words
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, moderation, 'Moderación de contenido completada');
  } catch (error) {
    console.error('Error al moderar contenido:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/reviews/my-reviews - Obtener reseñas del usuario actual
router.get('/my-reviews', validateReviewFilters, checkReviewPermissions(['patient']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;
    
    const filters = {
      patientId: userId
    };
    
    const pagination = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const results = await reviewService.getReviews(filters, pagination);
    
    await createAuditLog({
      userId,
      action: 'my_reviews_accessed',
      resource: 'reviews',
      details: { resultsCount: results.reviews.length },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    successResponse(res, results, 'Mis reseñas obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener mis reseñas:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

export default router;