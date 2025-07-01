import { query, withTransaction } from '../config/database.js';

// Create user in database from Clerk webhook
export const createUserInDB = async (clerkUser) => {
  try {
    const { id: clerkId, email_addresses, first_name, last_name, image_url, phone_numbers } = clerkUser;
    
    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0];
    const phone = phone_numbers?.[0]?.phone_number;
    
    if (!email) {
      throw new Error('Email is required');
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE clerk_id = $1 OR email = $2',
      [clerkId, email]
    );

    if (existingUser.rows.length > 0) {
      console.log(`User ${email} already exists, skipping creation`);
      return existingUser.rows[0];
    }

    return await withTransaction(async (client) => {
      // Create user record
      const userResult = await client.query(`
        INSERT INTO users (clerk_id, email, name, phone, avatar_url, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [clerkId, email, name, phone, image_url, 'patient']); // Default to patient role

      const user = userResult.rows[0];

      // Create default user preferences
      await client.query(`
        SELECT create_default_user_preferences($1)
      `, [user.id]);

      // Create patient profile by default
      await client.query(`
        SELECT create_patient_profile($1)
      `, [user.id]);

      console.log(`✅ User created: ${email} (${clerkId})`);
      return user;
    });

  } catch (error) {
    console.error('Error creating user in database:', error);
    throw error;
  }
};

// Update user in database from Clerk webhook
export const updateUserInDB = async (clerkUser) => {
  try {
    const { id: clerkId, email_addresses, first_name, last_name, image_url, phone_numbers } = clerkUser;
    
    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email?.split('@')[0];
    const phone = phone_numbers?.[0]?.phone_number;

    const result = await query(`
      UPDATE users 
      SET 
        email = $2,
        name = $3,
        phone = $4,
        avatar_url = $5,
        updated_at = NOW()
      WHERE clerk_id = $1
      RETURNING *
    `, [clerkId, email, name, phone, image_url]);

    if (result.rows.length === 0) {
      console.log(`User ${clerkId} not found for update, creating new user`);
      return await createUserInDB(clerkUser);
    }

    console.log(`✅ User updated: ${email} (${clerkId})`);
    return result.rows[0];

  } catch (error) {
    console.error('Error updating user in database:', error);
    throw error;
  }
};

// Delete user from database (Clerk webhook)
export const deleteUserFromDB = async (clerkId) => {
  try {
    const result = await query(`
      DELETE FROM users 
      WHERE clerk_id = $1
      RETURNING email
    `, [clerkId]);

    if (result.rows.length === 0) {
      console.log(`User ${clerkId} not found for deletion`);
      return null;
    }

    console.log(`✅ User deleted: ${result.rows[0].email} (${clerkId})`);
    return result.rows[0];

  } catch (error) {
    console.error('Error deleting user from database:', error);
    throw error;
  }
};

// Get user by Clerk ID
export const getUserByClerkId = async (clerkId) => {
  try {
    const result = await query(`
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
        up.language,
        up.timezone
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.clerk_id = $1
    `, [clerkId]);

    return result.rows[0] || null;

  } catch (error) {
    console.error('Error fetching user by Clerk ID:', error);
    throw error;
  }
};

// Create professional profile (for role upgrade)
export const createProfessionalProfile = async (userId, profileData) => {
  try {
    const { licenseNumber, dni, specialtyName, city } = profileData;

    return await withTransaction(async (client) => {
      // Update user role to professional
      await client.query(`
        UPDATE users 
        SET role = 'professional', updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Create professional profile
      await client.query(`
        SELECT create_professional_profile($1, $2, $3, $4)
      `, [userId, licenseNumber, dni, specialtyName || 'Medicina General']);

      // Get the created professional profile
      const profResult = await client.query(`
        SELECT * FROM professional_profiles WHERE user_id = $1
      `, [userId]);

      console.log(`✅ Professional profile created for user: ${userId}`);
      return profResult.rows[0];
    });

  } catch (error) {
    console.error('Error creating professional profile:', error);
    throw error;
  }
};

// Update user role (admin function)
export const updateUserRole = async (userId, newRole) => {
  try {
    const validRoles = ['patient', 'professional', 'admin'];
    
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    const result = await query(`
      UPDATE users 
      SET role = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [userId, newRole]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    console.log(`✅ User role updated: ${userId} -> ${newRole}`);
    return result.rows[0];

  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Get user profile with role-specific data
export const getUserProfile = async (clerkId) => {
  try {
    const user = await getUserByClerkId(clerkId);
    
    if (!user) {
      return null;
    }

    let profileData = { ...user };

    // Add role-specific data
    if (user.role === 'professional') {
      const profResult = await query(`
        SELECT * FROM professional_profiles WHERE clerk_id = $1
      `, [clerkId]);
      
      if (profResult.rows.length > 0) {
        profileData.professional = profResult.rows[0];
      }
    } else if (user.role === 'patient') {
      const patientResult = await query(`
        SELECT * FROM patient_profiles WHERE clerk_id = $1
      `, [clerkId]);
      
      if (patientResult.rows.length > 0) {
        profileData.patient = patientResult.rows[0];
      }
    }

    return profileData;

  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Update user preferences
export const updateUserPreferences = async (userId, preferences) => {
  try {
    const { theme, notifications_enabled, email_notifications, sms_notifications, language, timezone } = preferences;

    const result = await query(`
      UPDATE user_preferences 
      SET 
        theme = COALESCE($2, theme),
        notifications_enabled = COALESCE($3, notifications_enabled),
        email_notifications = COALESCE($4, email_notifications),
        sms_notifications = COALESCE($5, sms_notifications),
        language = COALESCE($6, language),
        timezone = COALESCE($7, timezone),
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [userId, theme, notifications_enabled, email_notifications, sms_notifications, language, timezone]);

    if (result.rows.length === 0) {
      // Create preferences if they don't exist
      await query(`SELECT create_default_user_preferences($1)`, [userId]);
      
      // Try update again
      return await updateUserPreferences(userId, preferences);
    }

    console.log(`✅ User preferences updated: ${userId}`);
    return result.rows[0];

  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};