import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withTransaction, query } from '../config/database.js';
import { updateUserStatus, refreshUserStatus } from '../middleware/userStatus.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/users/select-role
 * Assign role to user (patient or professional)
 */
router.post('/select-role', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { role } = req.body;

    if (!role || !['patient', 'professional'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (patient or professional) is required'
      });
    }

    const result = await withTransaction(async (client) => {
      // Update user role
      const userResult = await client.query(`
        UPDATE users 
        SET role = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [userId, role]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Create appropriate profile based on role
      if (role === 'patient') {
        // Create patient profile
        await client.query(`
          INSERT INTO patient_profiles (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `, [user.id]);

        // Set status to active for patients
        await updateUserStatus(userId, 'active');
      } else if (role === 'professional') {
        // Create professional profile (incomplete initially)
        await client.query(`
          INSERT INTO professionals (
            user_id, license_number, dni, profile_completed, verified
          )
          VALUES ($1, 'PENDING', 'PENDING', FALSE, FALSE)
          ON CONFLICT (user_id) DO UPDATE SET
            license_number = 'PENDING', dni = 'PENDING'
        `, [user.id]);

        // Set status to incomplete for professionals
        await updateUserStatus(userId, 'incomplete');
      }

      return user;
    });

    res.json({
      success: true,
      data: result,
      message: `Role ${role} assigned successfully`
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error assigning role'
    });
  }
});

/**
 * POST /api/users/professional-validation
 * Submit professional validation documents
 */
router.post('/professional-validation', async (req, res) => {
  try {
    const { userId } = req.auth;
    const {
      collegeNumber,
      dni,
      dniDocumentUrl,
      degreeDocumentUrl,
      certificationDocumentUrl,
      specialty,
      bio,
      experienceYears,
      education,
      certifications,
      consultationFee
    } = req.body;

    if (!collegeNumber || !dni) {
      return res.status(400).json({
        success: false,
        message: 'College number and DNI are required'
      });
    }

    const result = await withTransaction(async (client) => {
      // Get user by Clerk ID and check if they are a professional
      const userResult = await client.query(`
        SELECT id, role FROM users WHERE clerk_id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found in database. Please ensure the user is properly synced.');
      }

      const user = userResult.rows[0];
      const internalUserId = user.id;

      if (user.role !== 'professional') {
        throw new Error('User must be a professional to submit validation');
      }

      // Update professional profile
      await client.query(`
        UPDATE professionals 
        SET 
          license_number = $2,
          dni = $3,
          about = $4,
          experience_years = $5,
          education = $6,
          consultation_fee = $7,
          profile_completed = TRUE,
          updated_at = NOW()
        WHERE user_id = $1
      `, [
        internalUserId,
        collegeNumber,
        dni,
        bio,
        experienceYears,
        education,
        consultationFee
      ]);

      // Create validation record
      const validationResult = await client.query(`
        INSERT INTO professional_validations (
          user_id, 
          college_number, 
          dni, 
          dni_document_url, 
          degree_document_url, 
          certification_document_url,
          validation_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        ON CONFLICT (user_id) DO UPDATE SET
          college_number = $2,
          dni = $3,
          dni_document_url = $4,
          degree_document_url = $5,
          certification_document_url = $6,
          validation_status = 'pending',
          submitted_at = NOW(),
          updated_at = NOW()
        RETURNING *
      `, [
        internalUserId,
        collegeNumber,
        dni,
        dniDocumentUrl,
        degreeDocumentUrl,
        certificationDocumentUrl
      ]);

      // Update user status to pending validation
      await updateUserStatus(userId, 'pending_validation');

      return validationResult.rows[0];
    });

    res.json({
      success: true,
      data: result,
      message: 'Professional validation submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting professional validation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting professional validation'
    });
  }
});

/**
 * GET /api/users/validation-status
 * Get validation status for the current user
 */
router.get('/validation-status', async (req, res) => {
  try {
    const { userId } = req.auth;

    const result = await withTransaction(async (client) => {
      // Get user info
      const userResult = await client.query(`
        SELECT role, status FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      let validationInfo = null;

      if (user.role === 'professional') {
        // Get professional profile and validation info
        const profResult = await client.query(`
          SELECT 
            pp.*,
            pv.validation_status,
            pv.validation_notes,
            pv.submitted_at,
            pv.reviewed_at
          FROM professionals pp
          LEFT JOIN professional_validations pv ON pp.user_id = pv.user_id
          WHERE pp.user_id = $1
        `, [userId]);

        if (profResult.rows.length > 0) {
          validationInfo = profResult.rows[0];
        }
      }

      return {
        role: user.role,
        status: user.status,
        validation: validationInfo
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting validation status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting validation status'
    });
  }
});

/**
 * POST /api/users/approve-professional
 * Approve professional validation (admin only)
 */
router.post('/approve-professional', async (req, res) => {
  try {
    const { userId: adminUserId } = req.auth;
    const { professionalUserId, approved, notes } = req.body;

    if (!professionalUserId || approved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Professional user ID and approval status are required'
      });
    }

    // Check if user is admin
    const adminResult = await query(`
      SELECT role FROM users WHERE id = $1
    `, [adminUserId]);

    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can approve professional validations'
      });
    }

    const result = await withTransaction(async (client) => {
      const status = approved ? 'approved' : 'rejected';
      
      // Update validation status
      await client.query(`
        UPDATE professional_validations 
        SET 
          validation_status = $2,
          validation_notes = $3,
          reviewed_at = NOW(),
          reviewed_by = $4,
          updated_at = NOW()
        WHERE user_id = $1
      `, [professionalUserId, status, notes, adminUserId]);

      // Update professional profile
      if (approved) {
        await client.query(`
          UPDATE professionals 
          SET verified = TRUE, updated_at = NOW()
          WHERE user_id = $1
        `, [professionalUserId]);

        // Update user status to active
        await updateUserStatus(professionalUserId, 'active');
      } else {
        // If rejected, set back to incomplete
        await updateUserStatus(professionalUserId, 'incomplete');
      }

      return { status, notes };
    });

    res.json({
      success: true,
      data: result,
      message: `Professional ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Error processing professional approval:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing professional approval'
    });
  }
});

/**
 * GET /api/users/pending-validations
 * Get all pending professional validations (admin only)
 */
router.get('/pending-validations', async (req, res) => {
  try {
    const { userId } = req.auth;

    // Check if user is admin
    const adminResult = await query(`
      SELECT role FROM users WHERE id = $1
    `, [userId]);

    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view pending validations'
      });
    }

    const result = await query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        pp.*,
        pv.*
      FROM professional_validations pv
      JOIN users u ON pv.user_id = u.id
      JOIN professionals pp ON pv.user_id = pp.user_id
      WHERE pv.validation_status = 'pending'
      ORDER BY pv.submitted_at ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting pending validations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting pending validations'
    });
  }
});

export default router;