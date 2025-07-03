import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withTransaction } from '../config/database.js';
import { syncUserFromClerk } from '../controllers/userController.js';

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
          id, clerk_id, email, name, phone, avatar_url, role, 
          verified, created_at, updated_at
        FROM users 
        WHERE clerk_id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);
      return userResult.rows[0] || null;
    });
    
    if (!user) {
      // User doesn't exist in database, sync from Clerk
      console.log(`User ${userId} not found in database, syncing from Clerk...`);
      user = await syncUserFromClerk(userId);
    }
    
    const result = await withTransaction(async (client) => {
      
      // Get role-specific data based on user role
      let roleData = {};
      
      if (user.role === 'professional') {
        const profQuery = `
          SELECT 
            p.*, ps.name as subscription_name, ps.price, ps.features
          FROM professional_profiles p
          LEFT JOIN professional_subscriptions ps ON p.subscription_plan_id = ps.id
          WHERE p.user_id = $1
        `;
        const profResult = await client.query(profQuery, [user.id]);
        if (profResult.rows.length > 0) {
          roleData.professional = profResult.rows[0];
        }
      }
      
      if (user.role === 'patient') {
        const patientQuery = `
          SELECT * FROM patient_profiles WHERE user_id = $1
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
        WHERE clerk_id = $4
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
          UPDATE professional_profiles 
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
          UPDATE patient_profiles 
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
        WHERE clerk_id = $1
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
        WHERE clerk_id = $2
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
      const userQuery = `SELECT id, role FROM users WHERE clerk_id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const { id: dbUserId, role } = userResult.rows[0];
      let stats = {};
      
      if (role === 'professional') {
        // Professional dashboard stats
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
      } else if (role === 'patient') {
        // Patient dashboard stats
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
      } else if (role === 'admin') {
        // Admin dashboard stats
        const usersQuery = `
          SELECT 
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE role = 'professional') as total_professionals,
            COUNT(*) FILTER (WHERE role = 'patient') as total_patients
          FROM users
        `;
        const usersResult = await client.query(usersQuery);
        
        const appointmentsQuery = `
          SELECT COUNT(*) as total_appointments
          FROM appointments
        `;
        const appointmentsResult = await client.query(appointmentsQuery);
        
        stats = {
          ...usersResult.rows[0],
          ...appointmentsResult.rows[0]
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

export default router;