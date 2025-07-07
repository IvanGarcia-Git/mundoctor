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
        // Professional dashboard stats - using mock data for now since appointments table might not exist
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        // Mock data with realistic values
        stats = {
          totalPatients: 45,
          monthlyAppointments: 28,
          averageRating: 4.8,
          monthlyIncome: 3500,
          trends: {
            patients: '+12.5%',
            appointments: '+8.3%',
            rating: '+0.2',
            income: '+15.7%'
          }
        };
        
        // TODO: Replace with real queries when appointments table is available
        /*
        const appointmentsQuery = `
          SELECT 
            COUNT(*) as total_appointments,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_appointments,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
            COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming_appointments
          FROM appointments 
          WHERE professional_id = $1
        `;
        const appointmentsResult = await client.query(appointmentsQuery, [dbUserId]);
        
        const patientsQuery = `
          SELECT COUNT(DISTINCT patient_id) as total_patients
          FROM appointments 
          WHERE professional_id = $1
        `;
        const patientsResult = await client.query(patientsQuery, [dbUserId]);
        
        stats = {
          ...appointmentsResult.rows[0],
          ...patientsResult.rows[0]
        };
        */
      } else if (role === 'patient') {
        // Patient dashboard stats - using mock data for now
        stats = {
          nextAppointment: 'June 15',
          reviewsCount: 5,
          total_appointments: 8,
          scheduled_appointments: 2,
          completed_appointments: 6,
          upcoming_appointments: 2
        };
        
        // TODO: Replace with real queries when appointments table is available
        /*
        const appointmentsQuery = `
          SELECT 
            COUNT(*) as total_appointments,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_appointments,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
            COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming_appointments
          FROM appointments 
          WHERE patient_id = $1
        `;
        const appointmentsResult = await client.query(appointmentsQuery, [dbUserId]);
        
        stats = appointmentsResult.rows[0];
        */
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
        
        // Mock appointments data for now
        const appointmentsResult = { rows: [{ total_appointments: 850 }] };
        
        // Add mock monthly data for charts
        const monthlyUsers = [120, 145, 180, 195, 230, 280];
        const monthlySubscriptions = [80, 95, 120, 140, 180, 220];
        
        stats = {
          ...usersResult.rows[0],
          ...appointmentsResult.rows[0],
          usersByMonth: monthlyUsers,
          subscriptionsByMonth: monthlySubscriptions,
          pendingValidations: 15
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
      
      // Mock data for now - replace with real queries when appointments table is available
      let appointments = [];
      
      if (role === 'professional') {
        appointments = [
          {
            id: '1',
            patientName: 'María González',
            patientImage: null,
            type: 'Consulta General',
            time: '10:00',
            date: new Date().toISOString().split('T')[0],
            status: 'confirmed'
          },
          {
            id: '2',
            patientName: 'Carlos Rodriguez',
            patientImage: null,
            type: 'Seguimiento',
            time: '11:30',
            date: new Date().toISOString().split('T')[0],
            status: 'confirmed'
          },
          {
            id: '3',
            patientName: 'Ana López',
            patientImage: null,
            type: 'Primera Consulta',
            time: '14:00',
            date: new Date().toISOString().split('T')[0],
            status: 'pending'
          }
        ];
      } else if (role === 'patient') {
        appointments = [
          {
            id: '1',
            professionalName: 'Dr. García',
            specialty: 'Cardiología',
            time: '15:00',
            date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
            status: 'confirmed'
          }
        ];
      }
      
      return appointments.slice(0, parseInt(limit));
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
      
      // Mock data for now - replace with real queries when reviews table is available
      const reviews = [
        {
          id: '1',
          patientName: 'Laura Martín',
          patientImage: null,
          rating: 5,
          comment: 'Excelente profesional, muy atento y cuidadoso.',
          date: new Date().toLocaleDateString('es-ES')
        },
        {
          id: '2',
          patientName: 'Pedro Sánchez',
          patientImage: null,
          rating: 4,
          comment: 'Muy buen trato y explicaciones claras.',
          date: new Date(Date.now() - 86400000).toLocaleDateString('es-ES')
        },
        {
          id: '3',
          patientName: 'Elena García',
          patientImage: null,
          rating: 5,
          comment: 'Recomiendo totalmente, profesional de confianza.',
          date: new Date(Date.now() - 172800000).toLocaleDateString('es-ES')
        }
      ];
      
      return reviews.slice(0, parseInt(limit));
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