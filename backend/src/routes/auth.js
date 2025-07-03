import express from 'express';
import { query, withTransaction } from '../config/database.js';
import { clerkClient } from '@clerk/express';
import { Webhook } from 'svix';

const router = express.Router();

// Clerk webhook handler for user sync with signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!SIGNING_SECRET) {
      console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
      return res.status(500).json({ error: 'Webhook configuration error' });
    }

    // Verify webhook signature using Svix
    const wh = new Webhook(SIGNING_SECRET);
    const payload = req.body;
    const headers = req.headers;

    let evt;
    try {
      evt = wh.verify(payload, headers);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    console.log(`✅ Verified webhook with ID ${id} and type ${eventType}`);

    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      default:
        console.log('Unhandled webhook event:', eventType);
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

    // Find primary email address
    const primaryEmail = email_addresses.find(
      email => email.id === userData.primary_email_address_id
    )?.email_address || email_addresses[0]?.email_address;

    const name = `${first_name || ''} ${last_name || ''}`.trim() || primaryEmail?.split('@')[0] || 'Usuario';
    const phone = phone_numbers[0]?.phone_number;
    const role = public_metadata.role || 'patient';

    // Create user record using clerk_id as primary key
    const userResult = await client.query(`
      INSERT INTO users (id, email, name, role, phone, avatar_url, verified, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
      RETURNING *
    `, [clerkId, primaryEmail, name, role, phone, image_url, false, 'incomplete']);

    const user = userResult.rows[0];

    // Create default user preferences
    await client.query(`
      INSERT INTO user_preferences (user_id) 
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id]);

    // Create role-specific profile
    if (role === 'patient') {
      await client.query(`
        INSERT INTO patients (user_id) 
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);
    } else if (role === 'professional') {
      // For professionals, we need additional data from metadata
      const { license_number, dni, specialty } = public_metadata;
      
      await client.query(`
        INSERT INTO professionals (user_id) 
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);

      // If additional professional data is provided, update the profile
      if (license_number && dni) {
        await client.query(`
          UPDATE professionals 
          SET license_number = $2, dni = $3, specialty_name = $4
          WHERE user_id = $1
        `, [user.id, license_number, dni, specialty || 'Medicina General']);
      }
    }

    console.log('✅ User created in database:', { 
      clerkId: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role 
    });
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

  // Find primary email address
  const primaryEmail = email_addresses.find(
    email => email.id === userData.primary_email_address_id
  )?.email_address || email_addresses[0]?.email_address;

  const name = `${first_name || ''} ${last_name || ''}`.trim() || primaryEmail?.split('@')[0] || 'Usuario';
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
    WHERE id = $1
  `, [clerkId, primaryEmail, name, phone, image_url]);

  console.log('✅ User updated in database:', { clerkId, email: primaryEmail, name });
};

// Handle user deletion from Clerk
const handleUserDeleted = async (userData) => {
  const { id: clerkId } = userData;

  // Delete user (cascades to related tables)
  await query('DELETE FROM users WHERE id = $1', [clerkId]);

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
      WHERE u.id = $1
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