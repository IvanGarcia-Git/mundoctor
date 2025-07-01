import express from 'express';
import { query, withTransaction } from '../config/database.js';
import { clerkClient } from '@clerk/express';

const router = express.Router();

// Clerk webhook handler for user sync
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = req.body;
    const event = JSON.parse(payload);

    console.log('Clerk webhook received:', event.type);

    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;
      case 'user.updated':
        await handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle user creation from Clerk
const handleUserCreated = async (userData) => {
  await withTransaction(async (client) => {
    // Extract user data from Clerk
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      image_url,
      phone_numbers,
      public_metadata = {}
    } = userData;

    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email;
    const phone = phone_numbers[0]?.phone_number;
    const role = public_metadata.role || 'patient';

    // Create user record
    const userResult = await client.query(`
      INSERT INTO users (clerk_id, email, name, role, phone, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [clerkId, email, name, role, phone, image_url]);

    const userId = userResult.rows[0].id;

    // Create default preferences
    await client.query('SELECT create_default_user_preferences($1)', [userId]);

    // Create role-specific profile
    if (role === 'patient') {
      await client.query('SELECT create_patient_profile($1)', [userId]);
    } else if (role === 'professional') {
      // For professionals, we need additional data from metadata
      const { license_number, dni, specialty } = public_metadata;
      
      if (license_number && dni) {
        await client.query('SELECT create_professional_profile($1, $2, $3, $4)', [
          userId, 
          license_number, 
          dni, 
          specialty || 'Medicina General'
        ]);

        // Get professional ID and create default schedule
        const profResult = await client.query(
          'SELECT id FROM professionals WHERE user_id = $1', 
          [userId]
        );
        
        if (profResult.rows.length > 0) {
          await client.query('SELECT create_default_schedule($1)', [profResult.rows[0].id]);
        }
      }
    }

    console.log('✅ User created in database:', { clerkId, email, role });
  });
};

// Handle user updates from Clerk
const handleUserUpdated = async (userData) => {
  const {
    id: clerkId,
    email_addresses,
    first_name,
    last_name,
    image_url,
    phone_numbers,
    public_metadata = {}
  } = userData;

  const email = email_addresses[0]?.email_address;
  const name = `${first_name || ''} ${last_name || ''}`.trim() || email;
  const phone = phone_numbers[0]?.phone_number;

  // Update user record
  await query(`
    UPDATE users 
    SET 
      email = $2,
      name = $3,
      phone = $4,
      avatar_url = $5,
      updated_at = NOW()
    WHERE clerk_id = $1
  `, [clerkId, email, name, phone, image_url]);

  console.log('✅ User updated in database:', { clerkId, email });
};

// Handle user deletion from Clerk
const handleUserDeleted = async (userData) => {
  const { id: clerkId } = userData;

  // Delete user (cascades to related tables)
  await query('DELETE FROM users WHERE clerk_id = $1', [clerkId]);

  console.log('✅ User deleted from database:', { clerkId });
};

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const { userId } = req.auth; // Clerk middleware provides this

    // Get user from database
    const userResult = await query(`
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
        up.email_notifications,
        up.sms_notifications,
        up.language,
        up.timezone
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.clerk_id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Get role-specific data
    let roleData = {};
    
    if (user.role === 'professional') {
      const profResult = await query(`
        SELECT * FROM professional_profiles WHERE clerk_id = $1
      `, [userId]);
      
      if (profResult.rows.length > 0) {
        roleData = profResult.rows[0];
      }
    } else if (user.role === 'patient') {
      const patientResult = await query(`
        SELECT * FROM patient_profiles WHERE clerk_id = $1
      `, [userId]);
      
      if (patientResult.rows.length > 0) {
        roleData = patientResult.rows[0];
      }
    }

    res.json({
      user: {
        ...user,
        ...roleData
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user role (for onboarding)
router.patch('/role', async (req, res) => {
  try {
    const { userId } = req.auth;
    const { role, profileData = {} } = req.body;

    if (!['patient', 'professional'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await withTransaction(async (client) => {
      // Update user role
      await client.query(`
        UPDATE users SET role = $1, updated_at = NOW() WHERE clerk_id = $2
      `, [role, userId]);

      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE clerk_id = $1', 
        [userId]
      );
      const userUuid = userResult.rows[0].id;

      // Create role-specific profile
      if (role === 'patient') {
        await client.query('SELECT create_patient_profile($1)', [userUuid]);
      } else if (role === 'professional') {
        const { license_number, dni, specialty } = profileData;
        
        if (!license_number || !dni) {
          throw new Error('License number and DNI are required for professionals');
        }

        await client.query('SELECT create_professional_profile($1, $2, $3, $4)', [
          userUuid, 
          license_number, 
          dni, 
          specialty || 'Medicina General'
        ]);

        // Create default schedule
        const profResult = await client.query(
          'SELECT id FROM professionals WHERE user_id = $1', 
          [userUuid]
        );
        
        if (profResult.rows.length > 0) {
          await client.query('SELECT create_default_schedule($1)', [profResult.rows[0].id]);
        }
      }

      // Update Clerk user metadata
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: role,
          ...profileData
        }
      });
    });

    res.json({ success: true, role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;