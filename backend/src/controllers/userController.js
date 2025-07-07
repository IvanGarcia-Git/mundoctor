import { query, withTransaction } from '../config/database.js';
import { clerkClient } from '@clerk/express';

// Create user in database from Clerk webhook
export const createUserInDB = async (clerkUser) => {
  try {
    console.log('📧 Creating user from Clerk data:', JSON.stringify({
      id: clerkUser.id,
      emailAddresses: clerkUser.emailAddresses,
      email_addresses: clerkUser.email_addresses,
      firstName: clerkUser.firstName,
      first_name: clerkUser.first_name,
      lastName: clerkUser.lastName,
      last_name: clerkUser.last_name
    }, null, 2));

    const { id: clerkId, emailAddresses, email_addresses, firstName, first_name, lastName, last_name, imageUrl, image_url, phoneNumbers, phone_numbers, unsafeMetadata } = clerkUser;
    
    // Handle multiple possible email formats from Clerk
    const email = emailAddresses?.[0]?.emailAddress || 
                  email_addresses?.[0]?.email_address || 
                  email_addresses?.[0]?.emailAddress ||
                  clerkUser.email ||
                  clerkUser.primaryEmailAddress?.emailAddress;

    const name = `${firstName || first_name || ''} ${lastName || last_name || ''}`.trim() || 
                 (email ? email.split('@')[0] : 'Unknown User');
    
    const phone = phoneNumbers?.[0]?.phoneNumber || 
                  phone_numbers?.[0]?.phone_number || 
                  phone_numbers?.[0]?.phoneNumber;

    // Check if email is verified from Clerk
    const emailVerified = emailAddresses?.[0]?.verification?.status === 'verified' ||
                         email_addresses?.[0]?.verification?.status === 'verified' ||
                         clerkUser.primaryEmailAddress?.verification?.status === 'verified' ||
                         false;
    
    // Get role from user metadata, default to 'patient'
    const userRole = unsafeMetadata?.role || 'patient';
    
    if (!email) {
      throw new Error('Email is required');
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE id = $1 OR email = $2',
      [clerkId, email]
    );

    if (existingUser.rows.length > 0) {
      console.log(`User ${email} already exists, skipping creation`);
      return existingUser.rows[0];
    }

    return await withTransaction(async (client) => {
      // Create user record with clerk_id as primary key (cast enums properly)
      const userResult = await client.query(`
        INSERT INTO users (id, email, name, phone, avatar_url, role, status, verified)
        VALUES ($1, $2, $3, $4, $5, $6::user_role, $7::user_status, $8)
        RETURNING *
      `, [clerkId, email, name, phone, image_url, userRole, 'incomplete', emailVerified]); // Use clerk_id as primary key

      const user = userResult.rows[0];

      // Create default user preferences
      await client.query(`
        INSERT INTO user_preferences (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);

      // Create role-specific profile
      if (userRole === 'patient') {
        await client.query(`
          INSERT INTO patients (user_id) VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `, [user.id]);
      } else if (userRole === 'professional') {
        await client.query(`
          INSERT INTO professionals (user_id, license_number, dni, profile_completed, verified)
          VALUES ($1, 'PENDING', 'PENDING', FALSE, FALSE)
          ON CONFLICT (user_id) DO NOTHING
        `, [user.id]);
      }

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
    const { id: clerkId, email_addresses, emailAddresses, first_name, firstName, last_name, lastName, image_url, imageUrl, phone_numbers, phoneNumbers, unsafeMetadata } = clerkUser;
    
    const email = email_addresses?.[0]?.email_address || emailAddresses?.[0]?.emailAddress;
    const name = `${first_name || firstName || ''} ${last_name || lastName || ''}`.trim() || email?.split('@')[0];
    const phone = phone_numbers?.[0]?.phone_number || phoneNumbers?.[0]?.phoneNumber;

    // Check if email is verified from Clerk
    const emailVerified = emailAddresses?.[0]?.verification?.status === 'verified' ||
                         email_addresses?.[0]?.verification?.status === 'verified' ||
                         clerkUser.primaryEmailAddress?.verification?.status === 'verified' ||
                         false;

    // Get role from user metadata if provided
    const userRole = unsafeMetadata?.role;

    // Update query includes role if provided
    let updateQuery = `
      UPDATE users 
      SET 
        email = $2,
        name = $3,
        phone = $4,
        avatar_url = $5,
        verified = $6,
        updated_at = NOW()
    `;
    let queryParams = [clerkId, email, name, phone, image_url || imageUrl, emailVerified];

    if (userRole) {
      updateQuery += `, role = $7`;
      queryParams.push(userRole);
    }

    updateQuery += ` WHERE id = $1 RETURNING *`;

    const result = await query(updateQuery, queryParams);

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
      WHERE id = $1
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
      WHERE u.id = $1
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
        SET role = 'professional'::user_role, updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Create professional profile
      await client.query(`
        INSERT INTO professionals (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      // Get the created professional profile
      const profResult = await client.query(`
        SELECT * FROM professionals WHERE user_id = $1
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
      SET role = $2::user_role, updated_at = NOW()
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
        SELECT * FROM professionals WHERE user_id = $1
      `, [clerkId]);
      
      if (profResult.rows.length > 0) {
        profileData.professional = profResult.rows[0];
      }
    } else if (user.role === 'patient') {
      const patientResult = await query(`
        SELECT * FROM patients WHERE user_id = $1
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
      await query(`
        INSERT INTO user_preferences (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);
      
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

// Handle email update from Clerk webhook
export const handleEmailUpdate = async (webhookData) => {
  try {
    const { object } = webhookData;
    const userId = object.id; // This is the Clerk user ID
    const email = object.email_address;

    if (!userId || !email) {
      console.log('Incomplete email update data received');
      return;
    }

    // Update user email in our database
    const result = await query(`
      UPDATE users 
      SET email = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [userId, email]);

    if (result.rows.length > 0) {
      console.log(`✅ Email updated for user: ${userId} -> ${email}`);
    } else {
      console.log(`ℹ️  User ${userId} not found for email update`);
    }

    return result.rows[0];

  } catch (error) {
    console.error('Error handling email update:', error);
    throw error;
  }
};

// Handle SMS/phone update from Clerk webhook
export const handleSMSUpdate = async (webhookData) => {
  try {
    const { object } = webhookData;
    const userId = object.id; // This is the Clerk user ID
    const phone = object.phone_number;

    if (!userId || !phone) {
      console.log('Incomplete SMS update data received');
      return;
    }

    // Update user phone in our database
    const result = await query(`
      UPDATE users 
      SET phone = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [userId, phone]);

    if (result.rows.length > 0) {
      console.log(`✅ Phone updated for user: ${userId} -> ${phone}`);
    } else {
      console.log(`ℹ️  User ${userId} not found for phone update`);
    }

    return result.rows[0];

  } catch (error) {
    console.error('Error handling SMS update:', error);
    throw error;
  }
};

// Handle email verification from Clerk webhook
export const handleEmailVerification = async (webhookData) => {
  try {
    const { object } = webhookData;
    const userId = object.id; // This is the Clerk user ID

    if (!userId) {
      console.log('Incomplete email verification data received');
      return;
    }

    // Update user verification status in our database
    const result = await query(`
      UPDATE users 
      SET verified = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [userId]);

    if (result.rows.length > 0) {
      console.log(`✅ Email verified for user: ${userId}`);
    } else {
      console.log(`ℹ️  User ${userId} not found for email verification`);
    }

    return result.rows[0];

  } catch (error) {
    console.error('Error handling email verification:', error);
    throw error;
  }
};

// Manually sync user from Clerk (useful for fixing sync issues)
export const syncUserFromClerk = async (clerkId) => {
  try {
    console.log(`🔄 Syncing user from Clerk: ${clerkId}`);

    // Get user data from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkId);
    
    if (!clerkUser) {
      throw new Error(`User ${clerkId} not found in Clerk`);
    }

    // Check if user exists in our database
    const existingUser = await getUserByClerkId(clerkId);

    let result;
    if (existingUser) {
      // Update existing user
      result = await updateUserInDB(clerkUser);
      console.log(`✅ Existing user synced: ${clerkUser.emailAddresses?.[0]?.emailAddress}`);
    } else {
      // Create new user
      result = await createUserInDB(clerkUser);
      console.log(`✅ New user synced: ${clerkUser.emailAddresses?.[0]?.emailAddress}`);
    }

    return result;

  } catch (error) {
    console.error('Error syncing user from Clerk:', error);
    throw error;
  }
};

// Validate user sync status (useful for debugging)
export const validateUserSync = async (clerkId) => {
  try {
    const dbUser = await getUserByClerkId(clerkId);
    
    if (!dbUser) {
      return {
        synchronized: false,
        issue: 'User not found in database',
        clerkId
      };
    }

    // Get user from Clerk for comparison
    const clerkUser = await clerkClient.users.getUser(clerkId);
    
    if (!clerkUser) {
      return {
        synchronized: false,
        issue: 'User not found in Clerk',
        clerkId
      };
    }

    // Compare key fields
    const clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
    const clerkName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
    const clerkPhone = clerkUser.phoneNumbers?.[0]?.phoneNumber;

    const issues = [];
    
    if (dbUser.email !== clerkEmail) {
      issues.push(`Email mismatch: DB(${dbUser.email}) vs Clerk(${clerkEmail})`);
    }

    if (dbUser.name !== clerkName && clerkName) {
      issues.push(`Name mismatch: DB(${dbUser.name}) vs Clerk(${clerkName})`);
    }

    if (dbUser.phone !== clerkPhone && clerkPhone) {
      issues.push(`Phone mismatch: DB(${dbUser.phone}) vs Clerk(${clerkPhone})`);
    }

    return {
      synchronized: issues.length === 0,
      issues: issues.length > 0 ? issues : null,
      clerkId,
      lastUpdated: dbUser.updated_at
    };

  } catch (error) {
    console.error('Error validating user sync:', error);
    return {
      synchronized: false,
      issue: `Validation error: ${error.message}`,
      clerkId
    };
  }
};