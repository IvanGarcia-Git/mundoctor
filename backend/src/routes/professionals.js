import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
// import { validateRequest } from '../middleware/validation.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ================== PUBLIC ROUTES ==================

// Search professionals (public route for search page)
router.get('/search', async (req, res) => {
  try {
    const {
      q = '', // Search query
      specialty_id = null,
      city = null,
      rating_min = 0,
      consultation_fee_max = null,
      verified_only = false,
      page = 1,
      limit = 20,
      sort_by = 'rating', // rating, consultation_fee, experience_years, created_at
      sort_order = 'desc' // asc, desc
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build search conditions
    let whereConditions = [
      'u.role = $1',
      'u.status IN ($2, $3)'
    ];
    
    let queryParams = ['professional', 'active', 'pending_validation'];
    let paramIndex = 4;

    // Search by name or specialty
    if (q && q.trim()) {
      whereConditions.push(`(
        LOWER(u.name) LIKE $${paramIndex} OR 
        LOWER(p.about) LIKE $${paramIndex} OR
        LOWER(s.name) LIKE $${paramIndex}
      )`);
      queryParams.push(`%${q.toLowerCase()}%`);
      paramIndex++;
    }

    // Filter by specialty
    if (specialty_id) {
      whereConditions.push(`p.specialty_id = $${paramIndex}`);
      queryParams.push(specialty_id);
      paramIndex++;
    }

    // Filter by city
    if (city && city.trim()) {
      whereConditions.push(`LOWER(p.city) LIKE $${paramIndex}`);
      queryParams.push(`%${city.toLowerCase()}%`);
      paramIndex++;
    }

    // Filter by minimum rating
    if (rating_min && parseFloat(rating_min) > 0) {
      whereConditions.push(`p.rating >= $${paramIndex}`);
      queryParams.push(parseFloat(rating_min));
      paramIndex++;
    }

    // Filter by maximum consultation fee
    if (consultation_fee_max && parseFloat(consultation_fee_max) > 0) {
      whereConditions.push(`p.consultation_fee <= $${paramIndex}`);
      queryParams.push(parseFloat(consultation_fee_max));
      paramIndex++;
    }

    // Filter verified only
    if (verified_only === 'true') {
      whereConditions.push('p.verified = true');
    }

    // Validate sort options
    const validSortFields = ['rating', 'consultation_fee', 'experience_years', 'created_at', 'total_reviews'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'rating';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Build the main query
    const searchQuery = `
      SELECT 
        p.id,
        p.user_id,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        p.license_number,
        p.specialty_id,
        s.name as specialty_name,
        s.icon as specialty_icon,
        p.consultation_fee,
        p.city,
        p.address,
        p.latitude,
        p.longitude,
        p.rating,
        p.total_reviews,
        p.office_hours,
        p.services,
        p.about,
        p.education,
        p.experience_years,
        p.languages,
        p.verified,
        p.created_at,
        p.updated_at
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN specialties s ON p.specialty_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY p.${sortField} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN specialties s ON p.specialty_id = s.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    queryParams.push(parseInt(limit), offset);

    const [searchResult, countResult] = await Promise.all([
      query(searchQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const professionals = searchResult.rows.map(prof => ({
      ...prof,
      office_hours: prof.office_hours || {},
      services: prof.services || [],
      languages: prof.languages || [],
      consultation_fee: parseFloat(prof.consultation_fee) || 0,
      rating: parseFloat(prof.rating) || 0,
      total_reviews: parseInt(prof.total_reviews) || 0,
      experience_years: parseInt(prof.experience_years) || 0,
      verified: prof.verified || false
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        professionals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          query: q,
          specialty_id,
          city,
          rating_min: parseFloat(rating_min),
          consultation_fee_max: consultation_fee_max ? parseFloat(consultation_fee_max) : null,
          verified_only: verified_only === 'true',
          sort_by: sortField,
          sort_order: sortDirection.toLowerCase()
        }
      }
    });

  } catch (error) {
    logger.error('Error searching professionals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search professionals'
    });
  }
});

// Get all specialties (public route)
router.get('/specialties', async (req, res) => {
  try {
    const specialtiesQuery = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.icon,
        COUNT(p.id) as professionals_count
      FROM specialties s
      LEFT JOIN professionals p ON s.id = p.specialty_id
      LEFT JOIN users u ON p.user_id = u.id AND u.role = 'professional' AND u.status = 'active'
      GROUP BY s.id, s.name, s.description, s.icon
      ORDER BY s.name ASC
    `;

    const result = await query(specialtiesQuery);
    
    const specialties = result.rows.map(specialty => ({
      ...specialty,
      professionals_count: parseInt(specialty.professionals_count) || 0
    }));

    res.json({
      success: true,
      data: specialties
    });

  } catch (error) {
    logger.error('Error getting specialties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get specialties'
    });
  }
});

// Get featured professionals (public route)
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const featuredQuery = `
      SELECT 
        p.id,
        p.user_id,
        u.name,
        u.avatar_url,
        p.specialty_id,
        s.name as specialty_name,
        s.icon as specialty_icon,
        p.consultation_fee,
        p.city,
        p.rating,
        p.total_reviews,
        p.about,
        p.experience_years,
        p.verified
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN specialties s ON p.specialty_id = s.id
      WHERE u.role = 'professional' 
        AND u.status IN ('active', 'pending_validation')
        AND p.verified = true
        AND p.rating >= 4.0
        AND p.total_reviews >= 5
      ORDER BY p.rating DESC, p.total_reviews DESC
      LIMIT $1
    `;

    const result = await query(featuredQuery, [limit]);
    
    const featured = result.rows.map(prof => ({
      ...prof,
      consultation_fee: parseFloat(prof.consultation_fee) || 0,
      rating: parseFloat(prof.rating) || 0,
      total_reviews: parseInt(prof.total_reviews) || 0,
      experience_years: parseInt(prof.experience_years) || 0
    }));

    res.json({
      success: true,
      data: featured
    });

  } catch (error) {
    logger.error('Error getting featured professionals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get featured professionals'
    });
  }
});

// Get professional details (public route)
router.get('/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;

    const professionalQuery = `
      SELECT 
        p.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        u.status as user_status,
        s.name as specialty_name,
        s.description as specialty_description,
        s.icon as specialty_icon
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN specialties s ON p.specialty_id = s.id
      WHERE p.id = $1 OR p.user_id = $1
    `;

    const result = await query(professionalQuery, [professionalId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Professional not found'
      });
    }

    const professional = result.rows[0];

    // Get professional's services if they exist
    let services = [];
    try {
      const servicesResult = await query(
        'SELECT * FROM services WHERE professional_id = $1 AND is_active = true ORDER BY created_at DESC',
        [professional.user_id]
      );
      services = servicesResult.rows;
    } catch (servicesError) {
      // Services table might not exist, continue without it
      logger.warn('Services table not found, continuing without services data');
    }

    // Get professional's reviews
    let reviews = [];
    try {
      const reviewsResult = await query(`
        SELECT 
          r.*,
          u.name as patient_name,
          u.avatar_url as patient_avatar
        FROM reviews r
        JOIN users u ON r.patient_id = u.id
        WHERE r.professional_id = $1
        ORDER BY r.created_at DESC
        LIMIT 10
      `, [professional.user_id]);
      reviews = reviewsResult.rows;
    } catch (reviewsError) {
      logger.warn('Error fetching reviews:', reviewsError);
    }

    const professionalData = {
      ...professional,
      office_hours: professional.office_hours || {},
      services: professional.services || [],
      languages: professional.languages || [],
      consultation_fee: parseFloat(professional.consultation_fee) || 0,
      rating: parseFloat(professional.rating) || 0,
      total_reviews: parseInt(professional.total_reviews) || 0,
      experience_years: parseInt(professional.experience_years) || 0,
      verified: professional.verified || false,
      available_services: services,
      recent_reviews: reviews
    };

    res.json({
      success: true,
      data: professionalData
    });

  } catch (error) {
    logger.error('Error getting professional details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get professional details'
    });
  }
});

// ================== AUTHENTICATED ROUTES ==================

// Get professional dashboard data (for professional users)
router.get('/dashboard/stats', requireAuth, requireRole(['professional']), async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get professional stats
    const statsQueries = await Promise.all([
      // Total appointments
      query(`
        SELECT COUNT(*) as total
        FROM appointments 
        WHERE professional_id = $1
      `, [userId]),
      
      // This month appointments
      query(`
        SELECT COUNT(*) as total
        FROM appointments 
        WHERE professional_id = $1 
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      `, [userId]),
      
      // Average rating and total reviews
      query(`
        SELECT rating, total_reviews
        FROM professionals 
        WHERE user_id = $1
      `, [userId]),
      
      // Pending appointments
      query(`
        SELECT COUNT(*) as total
        FROM appointments 
        WHERE professional_id = $1 AND status = 'pending'
      `, [userId])
    ]);

    const stats = {
      totalAppointments: parseInt(statsQueries[0].rows[0]?.total) || 0,
      monthlyAppointments: parseInt(statsQueries[1].rows[0]?.total) || 0,
      rating: parseFloat(statsQueries[2].rows[0]?.rating) || 0,
      totalReviews: parseInt(statsQueries[2].rows[0]?.total_reviews) || 0,
      pendingAppointments: parseInt(statsQueries[3].rows[0]?.total) || 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting professional dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard stats'
    });
  }
});

// Update professional profile
router.put('/profile', requireAuth, requireRole(['professional']), async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      about,
      education,
      experience_years,
      consultation_fee,
      languages,
      office_hours
    } = req.body;

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (about !== undefined) {
      updateFields.push(`about = $${paramIndex++}`);
      values.push(about);
    }
    if (education !== undefined) {
      updateFields.push(`education = $${paramIndex++}`);
      values.push(education);
    }
    if (experience_years !== undefined) {
      updateFields.push(`experience_years = $${paramIndex++}`);
      values.push(experience_years);
    }
    if (consultation_fee !== undefined) {
      updateFields.push(`consultation_fee = $${paramIndex++}`);
      values.push(consultation_fee);
    }
    if (languages !== undefined) {
      updateFields.push(`languages = $${paramIndex++}`);
      values.push(JSON.stringify(languages));
    }
    if (office_hours !== undefined) {
      updateFields.push(`office_hours = $${paramIndex++}`);
      values.push(JSON.stringify(office_hours));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(userId);

    const updateQuery = `
      UPDATE professionals 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Professional profile not found'
      });
    }

    const updatedProfessional = result.rows[0];

    res.json({
      success: true,
      data: {
        ...updatedProfessional,
        office_hours: updatedProfessional.office_hours || {},
        languages: updatedProfessional.languages || [],
        consultation_fee: parseFloat(updatedProfessional.consultation_fee) || 0,
        experience_years: parseInt(updatedProfessional.experience_years) || 0
      }
    });

  } catch (error) {
    logger.error('Error updating professional profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

export default router;