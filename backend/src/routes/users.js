import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withTransaction } from '../config/database.js';
import { syncUserFromClerk } from '../controllers/userController.js';
import { clerkClient } from '@clerk/express';
import { 
  getUserStatusInfo, 
  attachUserStatus, 
  requireActiveStatus,
  requireCompletedRegistration,
  updateUserStatus,
  refreshUserStatus
} from '../middleware/userStatus.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * GET /api/users/profile
 * Get current user's profile information
 */
router.get('/profile', async (req, res) => {
  try {
    const { userId } = req.auth;
    
    // First check if user exists, if not sync from Clerk
    let user = await withTransaction(async (client) => {
      const userQuery = `
        SELECT 
          id, email, name, phone, avatar_url, role, 
          verified, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);
      return userResult.rows[0] || null;
    });
    
    if (!user) {
      // User doesn't exist in database, sync from Clerk
      console.log(`🔄 User ${userId} not found in database, syncing from Clerk...`);
      try {
        user = await syncUserFromClerk(userId);
        console.log(`✅ User ${userId} synced successfully`);
      } catch (syncError) {
        console.error(`❌ Failed to sync user ${userId}:`, syncError);
        return res.status(500).json({
          success: false,
          message: 'Failed to sync user data from Clerk',
          error: syncError.message
        });
      }
    }
    
    const result = await withTransaction(async (client) => {
      
      // Get role-specific data based on user role
      let roleData = {};
      
      if (user.role === 'professional') {
        const profQuery = `
          SELECT 
            p.*, ps.name as subscription_name, ps.price, ps.features
          FROM professionals p
          LEFT JOIN professional_subscriptions ps ON p.subscription_plan = ps.name
          WHERE p.user_id = $1
        `;
        const profResult = await client.query(profQuery, [user.id]);
        if (profResult.rows.length > 0) {
          roleData.professional = profResult.rows[0];
        }
      }
      
      if (user.role === 'patient') {
        const patientQuery = `
          SELECT * FROM patients WHERE user_id = $1
        `;
        const patientResult = await client.query(patientQuery, [user.id]);
        if (patientResult.rows.length > 0) {
          roleData.patient = patientResult.rows[0];
        }
      }
      
      return {
        ...user,
        ...roleData
      };
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user profile'
    });
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile information
 */
router.put('/profile', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { name, phone, avatar_url, ...otherData } = req.body;
    
    const result = await withTransaction(async (client) => {
      // Update basic user info
      const updateUserQuery = `
        UPDATE users 
        SET name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            avatar_url = COALESCE($3, avatar_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      const userResult = await client.query(updateUserQuery, [name, phone, avatar_url, userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      
      // Update role-specific profile if provided
      if (user.role === 'professional' && otherData.professional) {
        const profData = otherData.professional;
        const updateProfQuery = `
          UPDATE professionals 
          SET 
            specialty = COALESCE($1, specialty),
            bio = COALESCE($2, bio),
            experience_years = COALESCE($3, experience_years),
            education = COALESCE($4, education),
            certifications = COALESCE($5, certifications),
            consultation_fee = COALESCE($6, consultation_fee),
            available_hours = COALESCE($7, available_hours),
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $8
          RETURNING *
        `;
        await client.query(updateProfQuery, [
          profData.specialty,
          profData.bio,
          profData.experience_years,
          profData.education ? JSON.stringify(profData.education) : null,
          profData.certifications ? JSON.stringify(profData.certifications) : null,
          profData.consultation_fee,
          profData.available_hours ? JSON.stringify(profData.available_hours) : null,
          user.id
        ]);
      }
      
      if (user.role === 'patient' && otherData.patient) {
        const patientData = otherData.patient;
        const updatePatientQuery = `
          UPDATE patients 
          SET 
            date_of_birth = COALESCE($1, date_of_birth),
            gender = COALESCE($2, gender),
            emergency_contact = COALESCE($3, emergency_contact),
            medical_history = COALESCE($4, medical_history),
            allergies = COALESCE($5, allergies),
            current_medications = COALESCE($6, current_medications),
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $7
          RETURNING *
        `;
        await client.query(updatePatientQuery, [
          patientData.date_of_birth,
          patientData.gender,
          patientData.emergency_contact ? JSON.stringify(patientData.emergency_contact) : null,
          patientData.medical_history ? JSON.stringify(patientData.medical_history) : null,
          patientData.allergies ? JSON.stringify(patientData.allergies) : null,
          patientData.current_medications ? JSON.stringify(patientData.current_medications) : null,
          user.id
        ]);
      }
      
      return user;
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user profile'
    });
  }
});

/**
 * GET /api/users/preferences
 * Get current user's preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const { userId } = req.auth;
    
    const result = await withTransaction(async (client) => {
      const query = `
        SELECT preferences 
        FROM users 
        WHERE id = $1
      `;
      const queryResult = await client.query(query, [userId]);
      
      if (queryResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return queryResult.rows[0].preferences || {};
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user preferences'
    });
  }
});

/**
 * PUT /api/users/preferences
 * Update current user's preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const { userId } = req.auth;
    const preferences = req.body;
    
    const result = await withTransaction(async (client) => {
      const query = `
        UPDATE users 
        SET preferences = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING preferences
      `;
      const queryResult = await client.query(query, [JSON.stringify(preferences), userId]);
      
      if (queryResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return queryResult.rows[0].preferences;
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user preferences'
    });
  }
});

/**
 * GET /api/users/dashboard-stats
 * Get dashboard statistics for the current user based on their role
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const { userId } = req.auth;
    
    const result = await withTransaction(async (client) => {
      // Get user role first
      const userQuery = `SELECT id, role FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const { id: dbUserId, role } = userResult.rows[0];
      let stats = {};
      
      if (role === 'professional') {
        // Get real professional stats from appointments table
        try {
          const appointmentsQuery = `
            SELECT 
              COUNT(*) as total_appointments,
              COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed')) as scheduled_appointments,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
              COUNT(*) FILTER (WHERE scheduled_date >= CURRENT_DATE AND status IN ('scheduled', 'confirmed')) as upcoming_appointments,
              COUNT(DISTINCT patient_id) as total_patients
            FROM appointments 
            WHERE professional_id = $1
          `;
          const appointmentsResult = await client.query(appointmentsQuery, [dbUserId]);
          
          // Get average rating from reviews
          const ratingsQuery = `
            SELECT 
              COALESCE(AVG(rating), 0) as average_rating,
              COUNT(*) as reviews_count
            FROM reviews 
            WHERE professional_id = $1
          `;
          const ratingsResult = await client.query(ratingsQuery, [dbUserId]);
          
          stats = {
            ...appointmentsResult.rows[0],
            averageRating: parseFloat(ratingsResult.rows[0].average_rating).toFixed(1),
            reviewsCount: parseInt(ratingsResult.rows[0].reviews_count),
            monthlyIncome: 0 // TODO: Calculate from completed appointments with fees
          };
        } catch (error) {
          console.log('Professional stats query failed, using fallback data:', error.message);
          // Fallback to mock data if tables don't exist yet
          stats = {
            totalPatients: 0,
            total_appointments: 0,
            scheduled_appointments: 0,
            completed_appointments: 0,
            upcoming_appointments: 0,
            averageRating: 0,
            reviewsCount: 0,
            monthlyIncome: 0
          };
        }
      } else if (role === 'patient') {
        // Get real patient stats from appointments table
        try {
          const appointmentsQuery = `
            SELECT 
              COUNT(*) as total_appointments,
              COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed')) as scheduled_appointments,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
              COUNT(*) FILTER (WHERE scheduled_date >= CURRENT_DATE AND status IN ('scheduled', 'confirmed')) as upcoming_appointments
            FROM appointments 
            WHERE patient_id = $1
          `;
          const appointmentsResult = await client.query(appointmentsQuery, [dbUserId]);
          
          // Get next appointment info
          const nextAppointmentQuery = `
            SELECT 
              scheduled_date,
              start_time,
              pp.name as professional_name,
              ps.name as service_name
            FROM appointments a
            LEFT JOIN users pp ON a.professional_id = pp.id  
            LEFT JOIN professional_services ps ON a.service_id = ps.id
            WHERE a.patient_id = $1 
              AND a.scheduled_date >= CURRENT_DATE 
              AND a.status IN ('scheduled', 'confirmed')
            ORDER BY a.scheduled_date, a.start_time
            LIMIT 1
          `;
          const nextAppointmentResult = await client.query(nextAppointmentQuery, [dbUserId]);
          
          // Get reviews count
          const reviewsQuery = `
            SELECT COUNT(*) as reviews_count
            FROM reviews 
            WHERE patient_id = $1
          `;
          const reviewsResult = await client.query(reviewsQuery, [dbUserId]);
          
          stats = {
            ...appointmentsResult.rows[0],
            reviewsCount: parseInt(reviewsResult.rows[0].reviews_count),
            nextAppointment: nextAppointmentResult.rows.length > 0 ? 
              {
                date: nextAppointmentResult.rows[0].scheduled_date,
                time: nextAppointmentResult.rows[0].start_time,
                professionalName: nextAppointmentResult.rows[0].professional_name,
                serviceName: nextAppointmentResult.rows[0].service_name
              } : null
          };
        } catch (error) {
          console.log('Patient stats query failed, using fallback data:', error.message);
          // Fallback to mock data if tables don't exist yet
          stats = {
            total_appointments: 0,
            scheduled_appointments: 0,
            completed_appointments: 0,
            upcoming_appointments: 0,
            reviewsCount: 0,
            nextAppointment: null
          };
        }
      } else if (role === 'admin') {
        // Admin dashboard stats - get real data from users table (optimized)
        const usersQuery = `
          SELECT 
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE role = 'professional') as total_professionals,
            COUNT(*) FILTER (WHERE role = 'patient') as total_patients,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_last_month
          FROM users
        `;
        const usersResult = await client.query(usersQuery);
        
        // Try to get real appointments data
        let appointmentsData = { total_appointments: 0 };
        try {
          const appointmentsQuery = `SELECT COUNT(*) as total_appointments FROM appointments`;
          const appointmentsResult = await client.query(appointmentsQuery);
          appointmentsData = appointmentsResult.rows[0];
        } catch (error) {
          console.log('Admin appointments query failed, using fallback data:', error.message);
        }
        
        // Get pending professional validations
        let pendingValidationsCount = 0;
        try {
          const validationsQuery = `
            SELECT COUNT(*) as count
            FROM professional_validations
            WHERE status = 'pending'
          `;
          const validationsResult = await client.query(validationsQuery);
          pendingValidationsCount = parseInt(validationsResult.rows[0].count);
        } catch (error) {
          console.log('Admin pending validations query failed, using fallback data:', error.message);
        }

        // Get monthly user registrations (last 6 months)
        const usersByMonthQuery = `
          SELECT
            TO_CHAR(date_trunc('month', created_at), 'Mon') as month,
            COUNT(*) as count
          FROM users
          WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
          GROUP BY date_trunc('month', created_at)
          ORDER BY date_trunc('month', created_at) ASC;
        `;
        const usersByMonthResult = await client.query(usersByMonthQuery);
        const usersByMonth = usersByMonthResult.rows.map(row => parseInt(row.count));

        // Temporarily commented out subscriptions queries for debugging
        // let totalActiveSubscriptions = 0;
        // try {
        //   const activeSubscriptionsQuery = `
        //     SELECT COUNT(*) as count
        //     FROM subscriptions
        //     WHERE status = 'active'
        //   `;
        //   const activeSubscriptionsResult = await client.query(activeSubscriptionsQuery);
        //   totalActiveSubscriptions = parseInt(activeSubscriptionsResult.rows[0].count);
        // } catch (error) {
        //   console.log('Admin active subscriptions query failed, using fallback data:', error.message);
        // }

        // const subscriptionsByMonthQuery = `
        //   SELECT
        //     TO_CHAR(date_trunc('month', created_at), 'Mon') as month,
        //     COUNT(*) as count
        //   FROM subscriptions
        //   WHERE status = 'active' AND created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        //   GROUP BY date_trunc('month', created_at)
        //   ORDER BY date_trunc('month', created_at) ASC;
        // `;
        // const subscriptionsByMonthResult = await client.query(subscriptionsByMonthQuery);
        // const subscriptionsByMonth = subscriptionsByMonthResult.rows.map(row => parseInt(row.count));
        
        stats = {
          ...usersResult.rows[0],
          ...appointmentsData,
          usersByMonth: usersByMonth,
          subscriptionsByMonth: [], // Provide empty array as fallback
          pendingValidations: pendingValidationsCount,
          total_active_subscriptions: 0 // Provide 0 as fallback
        };
      }
      
      return stats;
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching dashboard stats'
    });
  }
});

/**
 * GET /api/users/dashboard-appointments
 * Get upcoming appointments for dashboard display
 */
router.get('/dashboard-appointments', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { limit = 5 } = req.query;
    
    const result = await withTransaction(async (client) => {
      // Get user role first
      const userQuery = `SELECT id, role FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const { role } = userResult.rows[0];
      let appointments = [];
      
      try {
        if (role === 'professional') {
          // Get upcoming appointments for professional
          const appointmentsQuery = `
            SELECT 
              a.id,
              a.scheduled_date,
              a.start_time,
              a.end_time,
              a.status,
              a.appointment_type,
              a.title,
              a.notes,
              pt.name as patient_name,
              pt.avatar_url as patient_image,
              ps.name as service_name
            FROM appointments a
            LEFT JOIN users pt ON a.patient_id = pt.id
            LEFT JOIN professional_services ps ON a.service_id = ps.id
            WHERE a.professional_id = $1 
              AND a.scheduled_date >= CURRENT_DATE 
              AND a.status IN ('scheduled', 'confirmed')
            ORDER BY a.scheduled_date, a.start_time
            LIMIT $2
          `;
          const appointmentsResult = await client.query(appointmentsQuery, [userId, parseInt(limit)]);
          
          appointments = appointmentsResult.rows.map(apt => ({
            id: apt.id,
            patientName: apt.patient_name || 'Paciente',
            patientImage: apt.patient_image,
            type: apt.service_name || apt.title || 'Consulta General',
            time: apt.start_time.slice(0, 5), // Format to HH:MM
            date: apt.scheduled_date,
            status: apt.status,
            appointmentType: apt.appointment_type
          }));
        } else if (role === 'patient') {
          // Get upcoming appointments for patient
          const appointmentsQuery = `
            SELECT 
              a.id,
              a.scheduled_date,
              a.start_time,
              a.end_time,
              a.status,
              a.appointment_type,
              a.title,
              a.notes,
              pp.name as professional_name,
              prof.specialty,
              ps.name as service_name
            FROM appointments a
            LEFT JOIN users pp ON a.professional_id = pp.id
            LEFT JOIN professionals prof ON a.professional_id = prof.user_id
            LEFT JOIN professional_services ps ON a.service_id = ps.id
            WHERE a.patient_id = $1 
              AND a.scheduled_date >= CURRENT_DATE 
              AND a.status IN ('scheduled', 'confirmed')
            ORDER BY a.scheduled_date, a.start_time
            LIMIT $2
          `;
          const appointmentsResult = await client.query(appointmentsQuery, [userId, parseInt(limit)]);
          
          appointments = appointmentsResult.rows.map(apt => ({
            id: apt.id,
            professionalName: apt.professional_name || 'Dr. Profesional',
            specialty: apt.specialty || 'Medicina General',
            serviceName: apt.service_name || apt.title,
            time: apt.start_time.slice(0, 5), // Format to HH:MM
            date: apt.scheduled_date,
            status: apt.status,
            appointmentType: apt.appointment_type
          }));
        }
      } catch (error) {
        console.log('Dashboard appointments query failed, using fallback data:', error.message);
        // Fallback to empty array if tables don't exist yet
        appointments = [];
      }
      
      return appointments;
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching dashboard appointments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching dashboard appointments'
    });
  }
});

/**
 * GET /api/users/dashboard-reviews
 * Get recent reviews for professional dashboard
 */
router.get('/dashboard-reviews', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { limit = 3 } = req.query;
    
    const result = await withTransaction(async (client) => {
      // Get user role first
      const userQuery = `SELECT id, role FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const { role } = userResult.rows[0];
      
      // Only professionals have reviews
      if (role !== 'professional') {
        return [];
      }
      
      let reviews = [];
      
      try {
        // Get recent reviews from database
        const reviewsQuery = `
          SELECT 
            r.id,
            r.rating,
            r.comment,
            r.created_at,
            pt.name as patient_name,
            pt.avatar_url as patient_image
          FROM reviews r
          LEFT JOIN users pt ON r.patient_id = pt.id
          WHERE r.professional_id = $1
          ORDER BY r.created_at DESC
          LIMIT $2
        `;
        const reviewsResult = await client.query(reviewsQuery, [userId, parseInt(limit)]);
        
        reviews = reviewsResult.rows.map(review => ({
          id: review.id,
          patientName: review.patient_name || 'Paciente Anónimo',
          patientImage: review.patient_image,
          rating: review.rating,
          comment: review.comment,
          date: new Date(review.created_at).toLocaleDateString('es-ES')
        }));
      } catch (error) {
        console.log('Dashboard reviews query failed, using fallback data:', error.message);
        // Fallback to empty array if tables don't exist yet
        reviews = [];
      }
      
      return reviews;
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching dashboard reviews:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching dashboard reviews'
    });
  }
});

/**
 * GET /api/users/dashboard-professionals
 * Get recent professionals for patient dashboard
 */
router.get('/dashboard-professionals', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { limit = 3 } = req.query;
    
    const result = await withTransaction(async (client) => {
      // Get user role first
      const userQuery = `SELECT id, role FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const { role } = userResult.rows[0];
      
      // Only patients need this data
      if (role !== 'patient') {
        return [];
      }
      
      let professionals = [];
      
      try {
        // Get recent professionals from patient's appointments
        const professionalsQuery = `
          SELECT DISTINCT
            pp.id,
            pp.name as professional_name,
            pp.avatar_url,
            prof.specialty,
            MAX(a.scheduled_date) as last_visit
          FROM appointments a
          LEFT JOIN users pp ON a.professional_id = pp.id
          LEFT JOIN professionals prof ON a.professional_id = prof.user_id
          WHERE a.patient_id = $1 
            AND a.status = 'completed'
          GROUP BY pp.id, pp.name, pp.avatar_url, prof.specialty
          ORDER BY last_visit DESC
          LIMIT $2
        `;
        const professionalsResult = await client.query(professionalsQuery, [userId, parseInt(limit)]);
        
        professionals = professionalsResult.rows.map(prof => ({
          id: prof.id,
          name: prof.professional_name || 'Dr. Profesional',
          specialty: prof.specialty || 'Medicina General',
          avatar: prof.avatar_url,
          lastVisit: prof.last_visit
        }));
      } catch (error) {
        console.log('Dashboard professionals query failed, using fallback data:', error.message);
        // Fallback to empty array if tables don't exist yet
        professionals = [];
      }
      
      return professionals;
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching dashboard professionals:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching dashboard professionals'
    });
  }
});

/**
 * GET /api/users/status
 * Get current user's status information
 */
router.get('/status', getUserStatusInfo);

/**
 * PUT /api/users/status
 * Update current user's status (admin only for now)
 */
router.put('/status', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const result = await updateUserStatus(userId, status);
    
    res.json({
      success: true,
      data: result,
      message: 'User status updated successfully'
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user status'
    });
  }
});

/**
 * POST /api/users/refresh-status
 * Refresh user status based on current profile completion
 */
router.post('/refresh-status', async (req, res) => {
  try {
    const { userId } = req.auth;
    
    const result = await refreshUserStatus(userId);
    
    res.json({
      success: true,
      data: result,
      message: 'User status refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing user status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error refreshing user status'
    });
  }
});

/**
 * POST /api/users/select-role
 * Select user role during onboarding process
 */
router.post('/select-role', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { role, profileData = {} } = req.body;

    console.log('🔄 Role selection request:', { userId, role, profileData });

    if (!role || !['patient', 'professional'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid role is required (patient or professional)' 
      });
    }

    const result = await withTransaction(async (client) => {
      // Update user role in database (cast to user_role enum type)
      const updateUserQuery = `
        UPDATE users 
        SET role = $1::user_role, 
            status = CASE 
              WHEN $1::user_role = 'patient' THEN 'active'::user_status
              WHEN $1::user_role = 'professional' THEN 'pending_validation'::user_status
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const userResult = await client.query(updateUserQuery, [role, userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Create role-specific profile
      if (role === 'patient') {
        await client.query(`
          INSERT INTO patients (user_id) 
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `, [userId]);
      } else if (role === 'professional') {
        const { license_number, dni, specialty } = profileData;
        
        // Create professional profile (without specialty initially - will be set during profile completion)
        await client.query(`
          INSERT INTO professionals (user_id, license_number, dni, profile_completed, verified)
          VALUES ($1, $2, $3, FALSE, FALSE)
          ON CONFLICT (user_id) DO UPDATE SET
            license_number = EXCLUDED.license_number,
            dni = EXCLUDED.dni
        `, [userId, license_number || 'PENDING', dni || 'PENDING']);
      }

      return user;
    });

    // Update Clerk metadata from backend (this has permission to update publicMetadata)
    try {
      await clerkClient.users.updateUser(userId, {
        publicMetadata: {
          role: role,
          onboardingComplete: role === 'patient' ? true : false
        }
      });
      console.log('✅ Clerk metadata updated from backend');
    } catch (clerkError) {
      console.warn('⚠️ Failed to update Clerk metadata:', clerkError.message);
      // Don't fail the request if Clerk metadata update fails
    }

    console.log('✅ Role selection completed:', { userId, role });

    res.json({
      success: true,
      data: result,
      message: 'Role selected successfully'
    });
  } catch (error) {
    console.error('Error selecting user role:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error selecting user role'
    });
  }
});

export default router;