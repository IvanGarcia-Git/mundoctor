import { query, withTransaction } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';

class ReviewService {
  // Crear una nueva reseña
  async createReview(reviewData) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      const { patientId, professionalId, appointmentId, rating, comment } = reviewData;
      
      // Verificar que el paciente tuvo una cita completada con el profesional
      const appointmentQuery = `
        SELECT id FROM appointments 
        WHERE id = $1 AND patient_id = $2 AND professional_id = $3 AND status = 'completed'
      `;
      
      const appointmentResult = await client.query(appointmentQuery, [appointmentId, patientId, professionalId]);
      
      if (appointmentResult.rows.length === 0) {
        throw new Error('Solo puedes reseñar profesionales con citas completadas');
      }
      
      // Verificar que no exista ya una reseña para esta cita
      const existingReviewQuery = `
        SELECT id FROM reviews 
        WHERE patient_id = $1 AND professional_id = $2 AND appointment_id = $3
      `;
      
      const existingResult = await client.query(existingReviewQuery, [patientId, professionalId, appointmentId]);
      
      if (existingResult.rows.length > 0) {
        throw new Error('Ya has reseñado esta cita');
      }
      
      // Crear la reseña
      const insertQuery = `
        INSERT INTO reviews (patient_id, professional_id, appointment_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [patientId, professionalId, appointmentId, rating, comment]);
      
      // Actualizar estadísticas del profesional
      await this.updateProfessionalRatingStats(professionalId, client);
      
      await client.query('COMMIT');
      
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al crear reseña:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Obtener reseñas con filtros y paginación
  async getReviews(filters = {}, pagination = {}) {
    try {
      const { professionalId, patientId, minRating, maxRating } = filters;
      const { limit = 10, offset = 0 } = pagination;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      if (professionalId) {
        whereConditions.push(`r.professional_id = $${paramIndex}`);
        queryParams.push(professionalId);
        paramIndex++;
      }
      
      if (patientId) {
        whereConditions.push(`r.patient_id = $${paramIndex}`);
        queryParams.push(patientId);
        paramIndex++;
      }
      
      if (minRating) {
        whereConditions.push(`r.rating >= $${paramIndex}`);
        queryParams.push(minRating);
        paramIndex++;
      }
      
      if (maxRating) {
        whereConditions.push(`r.rating <= $${paramIndex}`);
        queryParams.push(maxRating);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const reviewsQuery = `
        SELECT 
          r.id,
          r.rating,
          r.comment,
          r.created_at,
          r.updated_at,
          r.appointment_id,
          p.first_name || ' ' || p.last_name as patient_name,
          p.profile_image as patient_image,
          prof.first_name || ' ' || prof.last_name as professional_name,
          s.name as service_name,
          a.appointment_date
        FROM reviews r
        JOIN users p ON r.patient_id = p.id
        JOIN users prof ON r.professional_id = prof.id
        LEFT JOIN appointments a ON r.appointment_id = a.id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await query(reviewsQuery, queryParams);
      
      // Obtener total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM reviews r
        WHERE ${whereClause}
      `;
      
      const countResult = await query(countQuery, queryParams.slice(0, -2));
      
      return {
        reviews: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logError('Error al obtener reseñas:', error);
      throw error;
    }
  }
  
  // Obtener reseña por ID
  async getReviewById(reviewId) {
    try {
      const reviewQuery = `
        SELECT 
          r.*,
          p.first_name || ' ' || p.last_name as patient_name,
          p.profile_image as patient_image,
          prof.first_name || ' ' || prof.last_name as professional_name,
          s.name as service_name,
          a.appointment_date
        FROM reviews r
        JOIN users p ON r.patient_id = p.id
        JOIN users prof ON r.professional_id = prof.id
        LEFT JOIN appointments a ON r.appointment_id = a.id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE r.id = $1
      `;
      
      const result = await query(reviewQuery, [reviewId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al obtener reseña por ID:', error);
      throw error;
    }
  }
  
  // Actualizar reseña
  async updateReview(reviewId, userId, updates) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      // Verificar que la reseña pertenece al usuario
      const ownershipQuery = 'SELECT * FROM reviews WHERE id = $1 AND patient_id = $2';
      const ownershipResult = await client.query(ownershipQuery, [reviewId, userId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Reseña no encontrada o no autorizada');
      }
      
      const originalReview = ownershipResult.rows[0];
      
      // Actualizar solo campos permitidos
      const allowedFields = ['rating', 'comment'];
      const updateFields = {};
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateFields[field] = updates[field];
        }
      });
      
      if (Object.keys(updateFields).length === 0) {
        throw new Error('No hay campos para actualizar');
      }
      
      const setClause = Object.keys(updateFields)
        .map((key, index) => `${key} = $${index + 3}`)
        .join(', ');
      
      const updateQuery = `
        UPDATE reviews 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND patient_id = $2
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [reviewId, userId, ...Object.values(updateFields)]);
      
      // Si cambió el rating, actualizar estadísticas
      if (updates.rating && updates.rating !== originalReview.rating) {
        await this.updateProfessionalRatingStats(originalReview.professional_id, client);
      }
      
      await client.query('COMMIT');
      
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al actualizar reseña:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Eliminar reseña
  async deleteReview(reviewId, userId) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      // Verificar que la reseña pertenece al usuario
      const ownershipQuery = 'SELECT * FROM reviews WHERE id = $1 AND patient_id = $2';
      const ownershipResult = await client.query(ownershipQuery, [reviewId, userId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Reseña no encontrada o no autorizada');
      }
      
      const review = ownershipResult.rows[0];
      
      // Eliminar la reseña
      const deleteQuery = 'DELETE FROM reviews WHERE id = $1 AND patient_id = $2';
      await client.query(deleteQuery, [reviewId, userId]);
      
      // Actualizar estadísticas del profesional
      await this.updateProfessionalRatingStats(review.professional_id, client);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al eliminar reseña:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Obtener reseñas de un profesional específico
  async getProfessionalReviews(professionalId, pagination = {}) {
    try {
      const { limit = 10, offset = 0 } = pagination;
      
      const reviewsQuery = `
        SELECT 
          r.id,
          r.rating,
          r.comment,
          r.created_at,
          r.appointment_id,
          p.first_name || ' ' || p.last_name as patient_name,
          p.profile_image as patient_image,
          s.name as service_name,
          a.appointment_date
        FROM reviews r
        JOIN users p ON r.patient_id = p.id
        LEFT JOIN appointments a ON r.appointment_id = a.id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE r.professional_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(reviewsQuery, [professionalId, limit, offset]);
      
      // Obtener estadísticas del profesional
      const statsQuery = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
        FROM reviews 
        WHERE professional_id = $1
      `;
      
      const statsResult = await query(statsQuery, [professionalId]);
      
      return {
        reviews: result.rows,
        statistics: {
          total_reviews: parseInt(statsResult.rows[0].total_reviews),
          average_rating: parseFloat(statsResult.rows[0].average_rating) || 0,
          rating_distribution: {
            5: parseInt(statsResult.rows[0].five_stars),
            4: parseInt(statsResult.rows[0].four_stars),
            3: parseInt(statsResult.rows[0].three_stars),
            2: parseInt(statsResult.rows[0].two_stars),
            1: parseInt(statsResult.rows[0].one_star)
          }
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: parseInt(statsResult.rows[0].total_reviews)
        }
      };
      
    } catch (error) {
      logError('Error al obtener reseñas del profesional:', error);
      throw error;
    }
  }
  
  // Actualizar estadísticas de rating del profesional
  async updateProfessionalRatingStats(professionalId, client = null) {
    const queryClient = client || { query: query };
    
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating
        FROM reviews 
        WHERE professional_id = $1
      `;
      
      const result = await queryClient.query(statsQuery, [professionalId]);
      const stats = result.rows[0];
      
      // Actualizar la tabla de profesionales si existe
      const updateQuery = `
        UPDATE professional_profiles 
        SET 
          total_reviews = $2,
          average_rating = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `;
      
      await queryClient.query(updateQuery, [
        professionalId, 
        parseInt(stats.total_reviews),
        parseFloat(stats.average_rating) || 0
      ]);
      
    } catch (error) {
      logError('Error al actualizar estadísticas del profesional:', error);
      throw error;
    }
  }
  
  // Obtener estadísticas generales de reseñas
  async getReviewStatistics(filters = {}) {
    try {
      const { professionalId, dateFrom, dateTo } = filters;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      if (professionalId) {
        whereConditions.push(`professional_id = $${paramIndex}`);
        queryParams.push(professionalId);
        paramIndex++;
      }
      
      if (dateFrom) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }
      
      if (dateTo) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const statsQuery = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
          COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as reviews_with_comments
        FROM reviews 
        WHERE ${whereClause}
      `;
      
      const result = await query(statsQuery, queryParams);
      const stats = result.rows[0];
      
      return {
        total_reviews: parseInt(stats.total_reviews),
        average_rating: parseFloat(stats.average_rating) || 0,
        rating_distribution: {
          5: parseInt(stats.five_stars),
          4: parseInt(stats.four_stars),
          3: parseInt(stats.three_stars),
          2: parseInt(stats.two_stars),
          1: parseInt(stats.one_star)
        },
        reviews_with_comments: parseInt(stats.reviews_with_comments),
        comment_percentage: stats.total_reviews > 0 
          ? Math.round((stats.reviews_with_comments / stats.total_reviews) * 100) 
          : 0
      };
      
    } catch (error) {
      logError('Error al obtener estadísticas de reseñas:', error);
      throw error;
    }
  }
  
  // Validar que una reseña es legítima
  async validateReviewLegitimacy(patientId, professionalId, appointmentId) {
    try {
      // Verificar que existe la cita completada
      const appointmentQuery = `
        SELECT 
          id, 
          appointment_date, 
          status,
          created_at as appointment_created
        FROM appointments 
        WHERE id = $1 AND patient_id = $2 AND professional_id = $3 AND status = 'completed'
      `;
      
      const result = await query(appointmentQuery, [appointmentId, patientId, professionalId]);
      
      if (result.rows.length === 0) {
        return {
          valid: false,
          reason: 'No existe una cita completada entre el paciente y el profesional'
        };
      }
      
      const appointment = result.rows[0];
      
      // Verificar que la cita fue hace más de 1 hora (para dar tiempo a completarla)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(appointment.appointment_date) > oneHourAgo) {
        return {
          valid: false,
          reason: 'La cita debe haber terminado hace al menos 1 hora'
        };
      }
      
      // Verificar que no existe ya una reseña
      const existingReviewQuery = `
        SELECT id FROM reviews 
        WHERE patient_id = $1 AND professional_id = $2 AND appointment_id = $3
      `;
      
      const existingResult = await query(existingReviewQuery, [patientId, professionalId, appointmentId]);
      
      if (existingResult.rows.length > 0) {
        return {
          valid: false,
          reason: 'Ya existe una reseña para esta cita'
        };
      }
      
      return {
        valid: true,
        appointment: appointment
      };
      
    } catch (error) {
      logError('Error al validar legitimidad de reseña:', error);
      throw error;
    }
  }
  
  // Moderar contenido de reseña (básico)
  async moderateReviewContent(comment) {
    if (!comment) return { approved: true };
    
    // Lista básica de palabras inapropiadas
    const inappropriateWords = [
      'idiota', 'estúpido', 'imbécil', 'tonto', 'pendejo', 'cabrón',
      'mierda', 'puto', 'puta', 'joder', 'coño', 'hijo de puta'
    ];
    
    const lowerComment = comment.toLowerCase();
    
    for (const word of inappropriateWords) {
      if (lowerComment.includes(word)) {
        return {
          approved: false,
          reason: 'Contenido inapropiado detectado',
          flagged_words: [word]
        };
      }
    }
    
    // Verificar longitud mínima y máxima
    if (comment.length < 10) {
      return {
        approved: false,
        reason: 'El comentario es demasiado corto (mínimo 10 caracteres)'
      };
    }
    
    if (comment.length > 1000) {
      return {
        approved: false,
        reason: 'El comentario es demasiado largo (máximo 1000 caracteres)'
      };
    }
    
    return { approved: true };
  }
}

export default new ReviewService();