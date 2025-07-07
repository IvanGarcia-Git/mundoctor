import { clerkClient } from '@clerk/express';
import { withTransaction, query } from '../config/database.js';
import { logInfo, logError, logWarning } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';

// Sync user from Clerk to database
export const syncUserFromClerk = async (clerkUserId, options = {}) => {
  const { 
    createProfile = true, 
    updateExisting = true,
    auditInfo = {} 
  } = options;

  try {
    logInfo('Starting Clerk user sync', { clerkUserId, options });

    // Get user data from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    
    if (!clerkUser) {
      throw new Error(`User not found in Clerk: ${clerkUserId}`);
    }

    const result = await withTransaction(async (client) => {
      // Check if user already exists
      const existingUserResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [clerkUserId]
      );

      const userData = {
        id: clerkUserId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        phone: clerkUser.phoneNumbers[0]?.phoneNumber,
        avatar_url: clerkUser.imageUrl,
        verified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
        role: clerkUser.publicMetadata?.role || 'patient',
        status: clerkUser.publicMetadata?.status || 'active',
        created_at: new Date(clerkUser.createdAt),
        updated_at: new Date(),
      };

      let user;

      if (existingUserResult.rows.length === 0) {
        // Create new user
        const insertResult = await client.query(`
          INSERT INTO users (
            id, email, name, phone, avatar_url, verified, role, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          userData.id, userData.email, userData.name, userData.phone,
          userData.avatar_url, userData.verified, userData.role, userData.status,
          userData.created_at, userData.updated_at
        ]);
        
        user = insertResult.rows[0];
        
        logInfo('User created from Clerk sync', { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        });

        // Create audit log
        await createAuditLog({
          userId: user.id,
          action: AuditActions.USER_CREATED,
          resource: 'user',
          resourceId: user.id,
          details: {
            source: 'clerk_sync',
            email: user.email,
            role: user.role,
          },
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          riskLevel: RiskLevels.LOW,
        });

        // Create role-specific profile if requested
        if (createProfile) {
          await createRoleProfile(client, user);
        }

      } else if (updateExisting) {
        // Update existing user
        const updateResult = await client.query(`
          UPDATE users 
          SET email = $2, name = $3, phone = $4, avatar_url = $5, 
              verified = $6, role = $7, status = $8, updated_at = $9
          WHERE id = $1
          RETURNING *
        `, [
          userData.id, userData.email, userData.name, userData.phone,
          userData.avatar_url, userData.verified, userData.role, userData.status,
          userData.updated_at
        ]);
        
        user = updateResult.rows[0];
        
        logInfo('User updated from Clerk sync', { 
          userId: user.id,
          email: user.email,
          role: user.role 
        });

        // Create audit log
        await createAuditLog({
          userId: user.id,
          action: AuditActions.USER_UPDATED,
          resource: 'user',
          resourceId: user.id,
          details: {
            source: 'clerk_sync',
            changes: userData,
          },
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          riskLevel: RiskLevels.LOW,
        });

      } else {
        user = existingUserResult.rows[0];
      }

      return user;
    });

    return result;

  } catch (error) {
    logError(error, { 
      event: 'clerk_sync_failed',
      clerkUserId,
      options 
    });
    throw error;
  }
};

// Create role-specific profile
const createRoleProfile = async (client, user) => {
  try {
    if (user.role === 'professional') {
      await client.query(`
        INSERT INTO professionals (
          user_id, profile_completed, verified, subscription_plan, created_at, updated_at
        ) VALUES ($1, false, false, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);

      logInfo('Professional profile created', { userId: user.id });

    } else if (user.role === 'patient') {
      await client.query(`
        INSERT INTO patients (
          user_id, created_at, updated_at
        ) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);

      logInfo('Patient profile created', { userId: user.id });
    }

    // Create default user preferences
    await client.query(`
      INSERT INTO user_preferences (
        user_id, theme, notifications_enabled, language, timezone, created_at, updated_at
      ) VALUES ($1, 'light', true, 'es', 'Europe/Madrid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id]);

  } catch (error) {
    logError(error, { 
      event: 'create_role_profile_failed',
      userId: user.id,
      role: user.role 
    });
    throw error;
  }
};

// Sync user metadata to Clerk
export const syncMetadataToClerk = async (userId, metadata = {}) => {
  try {
    logInfo('Syncing metadata to Clerk', { userId, metadata });

    await clerkClient.users.updateUser(userId, {
      publicMetadata: metadata,
    });

    logInfo('Metadata synced to Clerk successfully', { userId });

    // Create audit log
    await createAuditLog({
      userId,
      action: AuditActions.USER_UPDATED,
      resource: 'user_metadata',
      resourceId: userId,
      details: {
        source: 'metadata_sync',
        metadata,
      },
      riskLevel: RiskLevels.LOW,
    });

  } catch (error) {
    logError(error, { 
      event: 'clerk_metadata_sync_failed',
      userId,
      metadata 
    });
    throw error;
  }
};

// Handle role change with profile management
export const handleRoleChange = async (userId, newRole, options = {}) => {
  const { auditInfo = {} } = options;

  try {
    logInfo('Handling role change', { userId, newRole });

    const result = await withTransaction(async (client) => {
      // Get current user
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      const user = userResult.rows[0];
      const oldRole = user.role;

      // Update user role
      await client.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newRole, userId]
      );

      // Create new role profile
      await createRoleProfile(client, { ...user, role: newRole });

      // Update Clerk metadata
      await syncMetadataToClerk(userId, {
        role: newRole,
        onboardingComplete: newRole === 'patient' ? true : false,
      });

      // Create audit log for role change
      await createAuditLog({
        userId,
        action: AuditActions.ROLE_CHANGED,
        resource: 'user_role',
        resourceId: userId,
        details: {
          oldRole,
          newRole,
          source: 'manual_change',
        },
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        riskLevel: RiskLevels.HIGH, // Role changes are high-risk
      });

      logInfo('Role change completed', { 
        userId, 
        oldRole, 
        newRole 
      });

      return { oldRole, newRole };
    });

    return result;

  } catch (error) {
    logError(error, { 
      event: 'role_change_failed',
      userId,
      newRole 
    });
    throw error;
  }
};

// Validate user data consistency between Clerk and database
export const validateUserConsistency = async (userId) => {
  try {
    logInfo('Validating user consistency', { userId });

    const [clerkUser, dbUser] = await Promise.all([
      clerkClient.users.getUser(userId),
      query('SELECT * FROM users WHERE id = $1', [userId]),
    ]);

    if (!clerkUser) {
      throw new Error(`User not found in Clerk: ${userId}`);
    }

    if (dbUser.rows.length === 0) {
      throw new Error(`User not found in database: ${userId}`);
    }

    const dbUserData = dbUser.rows[0];
    const inconsistencies = [];

    // Check email consistency
    const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress;
    if (clerkEmail !== dbUserData.email) {
      inconsistencies.push({
        field: 'email',
        clerk: clerkEmail,
        database: dbUserData.email,
      });
    }

    // Check role consistency
    const clerkRole = clerkUser.publicMetadata?.role;
    if (clerkRole && clerkRole !== dbUserData.role) {
      inconsistencies.push({
        field: 'role',
        clerk: clerkRole,
        database: dbUserData.role,
      });
    }

    // Check verification status
    const clerkVerified = clerkUser.emailAddresses[0]?.verification?.status === 'verified';
    if (clerkVerified !== dbUserData.verified) {
      inconsistencies.push({
        field: 'verified',
        clerk: clerkVerified,
        database: dbUserData.verified,
      });
    }

    if (inconsistencies.length > 0) {
      logWarning('User data inconsistencies detected', {
        userId,
        inconsistencies,
      });

      // Create audit log for inconsistencies
      await createAuditLog({
        userId,
        action: AuditActions.SUSPICIOUS_ACTIVITY,
        resource: 'user_consistency',
        resourceId: userId,
        details: {
          inconsistencies,
          clerkData: {
            email: clerkEmail,
            role: clerkRole,
            verified: clerkVerified,
          },
          databaseData: {
            email: dbUserData.email,
            role: dbUserData.role,
            verified: dbUserData.verified,
          },
        },
        riskLevel: RiskLevels.MEDIUM,
      });
    }

    return {
      consistent: inconsistencies.length === 0,
      inconsistencies,
    };

  } catch (error) {
    logError(error, { 
      event: 'user_consistency_validation_failed',
      userId 
    });
    throw error;
  }
};

// Rollback user creation in case of errors
export const rollbackUserCreation = async (userId, reason = 'sync_error') => {
  try {
    logWarning('Rolling back user creation', { userId, reason });

    await withTransaction(async (client) => {
      // Delete from role-specific tables first (foreign key constraints)
      await client.query('DELETE FROM professionals WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM patients WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
      
      // Delete from main users table
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: AuditActions.USER_DELETED,
      resource: 'user',
      resourceId: userId,
      details: {
        source: 'rollback',
        reason,
      },
      riskLevel: RiskLevels.HIGH,
    });

    logInfo('User creation rollback completed', { userId, reason });

  } catch (error) {
    logError(error, { 
      event: 'user_rollback_failed',
      userId,
      reason 
    });
    throw error;
  }
};

// Bulk sync users from Clerk (for data migration/recovery)
export const bulkSyncUsers = async (options = {}) => {
  const { 
    limit = 100, 
    offset = 0, 
    createProfiles = true,
    dryRun = false 
  } = options;

  try {
    logInfo('Starting bulk user sync', { limit, offset, dryRun });

    const clerkUsers = await clerkClient.users.getUserList({
      limit,
      offset,
    });

    const results = {
      total: clerkUsers.length,
      created: 0,
      updated: 0,
      errors: 0,
      errors_details: [],
    };

    for (const clerkUser of clerkUsers) {
      try {
        if (!dryRun) {
          await syncUserFromClerk(clerkUser.id, {
            createProfile: createProfiles,
            updateExisting: true,
          });
        }
        
        // Check if user exists to determine if it would be created or updated
        const existingUser = await query(
          'SELECT id FROM users WHERE id = $1',
          [clerkUser.id]
        );
        
        if (existingUser.rows.length === 0) {
          results.created++;
        } else {
          results.updated++;
        }

      } catch (error) {
        results.errors++;
        results.errors_details.push({
          userId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          error: error.message,
        });
        
        logError(error, { 
          event: 'bulk_sync_user_failed',
          userId: clerkUser.id 
        });
      }
    }

    logInfo('Bulk user sync completed', results);
    return results;

  } catch (error) {
    logError(error, { 
      event: 'bulk_sync_failed',
      options 
    });
    throw error;
  }
};

export default {
  syncUserFromClerk,
  syncMetadataToClerk,
  handleRoleChange,
  validateUserConsistency,
  rollbackUserCreation,
  bulkSyncUsers,
};