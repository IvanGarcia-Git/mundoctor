import { query } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';

class SearchService {
  // Búsqueda general de profesionales
  async searchProfessionals(searchParams, pagination) {
    try {
      const { query, specialty, location, minRating, maxPrice, availability } = searchParams;
      const { limit, offset } = pagination;
      
      let whereConditions = ['u.role = \'professional\' AND u.status = \'active\''];
      let queryParams = [];
      let paramIndex = 1;
      
      // Búsqueda por texto (nombre, especialidad, descripción)
      if (query) {
        whereConditions.push(`(
          u.first_name ILIKE $${paramIndex} OR 
          u.last_name ILIKE $${paramIndex} OR 
          pp.specialty ILIKE $${paramIndex} OR 
          pp.about ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${query}%`);
        paramIndex++;
      }
      
      // Filtro por especialidad
      if (specialty) {
        whereConditions.push(`pp.specialty = $${paramIndex}`);
        queryParams.push(specialty);
        paramIndex++;
      }
      
      // Filtro por ubicación (ciudad)
      if (location) {
        whereConditions.push(`(
          pp.office_city ILIKE $${paramIndex} OR 
          pp.office_address ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${location}%`);
        paramIndex++;
      }
      
      // Filtro por rating mínimo
      if (minRating) {
        whereConditions.push(`AVG(r.rating) >= $${paramIndex}`);
        queryParams.push(minRating);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      let havingClause = '';
      if (minRating) {
        havingClause = `HAVING AVG(r.rating) >= ${minRating}`;
      }
      
      const searchQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          u.profile_image,
          u.email,
          u.phone,
          pp.specialty,
          pp.license_number,
          pp.years_of_experience,
          pp.office_address,
          pp.office_city,
          pp.office_state,
          pp.office_phone,
          pp.about,
          pp.consultation_fee,
          pp.languages,
          AVG(r.rating) as average_rating,
          COUNT(r.id) as review_count,
          COUNT(DISTINCT a.id) as appointment_count,
          u.created_at
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        LEFT JOIN appointments a ON u.id = a.professional_id
        ${whereClause}
        GROUP BY u.id, u.first_name, u.last_name, u.profile_image, u.email, u.phone,
                 pp.specialty, pp.license_number, pp.years_of_experience, pp.office_address,
                 pp.office_city, pp.office_state, pp.office_phone, pp.about, 
                 pp.consultation_fee, pp.languages, u.created_at
        ${havingClause}
        ORDER BY average_rating DESC NULLS LAST, review_count DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await query(searchQuery, queryParams);
      
      // Obtener total de resultados
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        ${whereClause}
        ${havingClause}
      `;
      
      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      
      return {
        professionals: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logger.error('Error en búsqueda de profesionales:', error);
      throw error;
    }
  }
  
  // Búsqueda de profesionales cercanos por coordenadas
  async searchNearbyProfessionals(latitude, longitude, radius = 10, filters = {}, pagination = {}) {
    try {
      const { specialty, minRating } = filters;
      const { limit = 10, offset = 0 } = pagination;
      
      let whereConditions = ['u.role = \'professional\' AND u.status = \'active\''];
      let queryParams = [latitude, longitude, radius];
      let paramIndex = 4;
      
      // Filtro por especialidad
      if (specialty) {
        whereConditions.push(`pp.specialty = $${paramIndex}`);
        queryParams.push(specialty);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      let havingClause = '';
      if (minRating) {
        havingClause = `HAVING AVG(r.rating) >= ${minRating}`;
        queryParams.push(minRating);
      }
      
      const nearbyQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          u.profile_image,
          u.email,
          u.phone,
          pp.specialty,
          pp.office_address,
          pp.office_city,
          pp.office_state,
          pp.office_phone,
          pp.office_latitude,
          pp.office_longitude,
          pp.about,
          pp.consultation_fee,
          AVG(r.rating) as average_rating,
          COUNT(r.id) as review_count,
          (
            6371 * acos(
              cos(radians($1)) * cos(radians(pp.office_latitude)) * 
              cos(radians(pp.office_longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(pp.office_latitude))
            )
          ) as distance
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        ${whereClause}
        AND pp.office_latitude IS NOT NULL 
        AND pp.office_longitude IS NOT NULL
        GROUP BY u.id, u.first_name, u.last_name, u.profile_image, u.email, u.phone,
                 pp.specialty, pp.office_address, pp.office_city, pp.office_state, 
                 pp.office_phone, pp.office_latitude, pp.office_longitude, pp.about, 
                 pp.consultation_fee
        ${havingClause}
        HAVING (
          6371 * acos(
            cos(radians($1)) * cos(radians(pp.office_latitude)) * 
            cos(radians(pp.office_longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(pp.office_latitude))
          )
        ) <= $3
        ORDER BY distance ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await db.query(nearbyQuery, queryParams);
      
      return {
        professionals: result.rows,
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logger.error('Error en búsqueda de profesionales cercanos:', error);
      throw error;
    }
  }
  
  // Filtrar profesionales por especialidad
  async filterProfessionalsBySpecialty(specialty, additionalFilters = {}, pagination = {}) {
    try {
      const { minRating, maxPrice, location, experience } = additionalFilters;
      const { limit = 10, offset = 0 } = pagination;
      
      let whereConditions = [
        'u.role = \'professional\'',
        'u.status = \'active\'',
        'pp.specialty = $1'
      ];
      let queryParams = [specialty];
      let paramIndex = 2;
      
      // Filtro por ubicación
      if (location) {
        whereConditions.push(`(
          pp.office_city ILIKE $${paramIndex} OR 
          pp.office_address ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${location}%`);
        paramIndex++;
      }
      
      // Filtro por precio máximo
      if (maxPrice) {
        whereConditions.push(`pp.consultation_fee <= $${paramIndex}`);
        queryParams.push(maxPrice);
        paramIndex++;
      }
      
      // Filtro por experiencia mínima
      if (experience) {
        whereConditions.push(`pp.years_of_experience >= $${paramIndex}`);
        queryParams.push(experience);
        paramIndex++;
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      let havingClause = '';
      if (minRating) {
        havingClause = `HAVING AVG(r.rating) >= ${minRating}`;
      }
      
      const filterQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          u.profile_image,
          u.email,
          u.phone,
          pp.specialty,
          pp.license_number,
          pp.years_of_experience,
          pp.office_address,
          pp.office_city,
          pp.office_state,
          pp.office_phone,
          pp.about,
          pp.consultation_fee,
          pp.languages,
          AVG(r.rating) as average_rating,
          COUNT(r.id) as review_count,
          u.created_at
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        ${whereClause}
        GROUP BY u.id, u.first_name, u.last_name, u.profile_image, u.email, u.phone,
                 pp.specialty, pp.license_number, pp.years_of_experience, pp.office_address,
                 pp.office_city, pp.office_state, pp.office_phone, pp.about, 
                 pp.consultation_fee, pp.languages, u.created_at
        ${havingClause}
        ORDER BY average_rating DESC NULLS LAST, pp.years_of_experience DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await db.query(filterQuery, queryParams);
      
      // Obtener total de resultados
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        ${whereClause}
        ${havingClause}
      `;
      
      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      
      return {
        professionals: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logger.error('Error al filtrar profesionales por especialidad:', error);
      throw error;
    }
  }
  
  // Obtener todas las especialidades disponibles
  async getAvailableSpecialties() {
    try {
      const query = `
        SELECT 
          pp.specialty,
          COUNT(DISTINCT u.id) as professional_count
        FROM users u
        JOIN professional_profiles pp ON u.id = pp.user_id
        WHERE u.role = 'professional' AND u.status = 'active'
        GROUP BY pp.specialty
        ORDER BY professional_count DESC, pp.specialty ASC
      `;
      
      const result = await db.query(query);
      return result.rows;
      
    } catch (error) {
      logger.error('Error al obtener especialidades:', error);
      throw error;
    }
  }
  
  // Obtener profesionales destacados/populares
  async getFeaturedProfessionals(limit = 10) {
    try {
      const query = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          u.profile_image,
          pp.specialty,
          pp.office_address,
          pp.office_city,
          pp.about,
          pp.consultation_fee,
          AVG(r.rating) as average_rating,
          COUNT(r.id) as review_count,
          COUNT(DISTINCT a.id) as appointment_count
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        LEFT JOIN appointments a ON u.id = a.professional_id
        WHERE u.role = 'professional' AND u.status = 'active'
        GROUP BY u.id, u.first_name, u.last_name, u.profile_image,
                 pp.specialty, pp.office_address, pp.office_city, pp.about, 
                 pp.consultation_fee
        HAVING AVG(r.rating) >= 4.0
        ORDER BY average_rating DESC, review_count DESC, appointment_count DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      return result.rows;
      
    } catch (error) {
      logger.error('Error al obtener profesionales destacados:', error);
      throw error;
    }
  }
}

export default new SearchService();