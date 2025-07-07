#!/usr/bin/env node

import dotenv from 'dotenv';
import { clerkClient } from '@clerk/express';
import { query, testConnection } from '../config/database.js';
import { syncUserFromClerk } from '../controllers/userController.js';

dotenv.config();

const diagnoseUserSync = async (clerkUserId) => {
  if (!clerkUserId) {
    console.error('❌ Please provide a Clerk User ID');
    console.log('Usage: node diagnoseUserSync.js <clerk-user-id>');
    process.exit(1);
  }

  console.log(`🔍 Diagnosing user sync for: ${clerkUserId}\n`);

  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.log('   ❌ Database connection failed');
      process.exit(1);
    }
    console.log('   ✅ Database connected');

    // 2. Check if user exists in Clerk
    console.log('\n2. Checking Clerk user...');
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId);
      console.log('   ✅ User found in Clerk');
      console.log(`   📧 Email: ${clerkUser.emailAddresses?.[0]?.emailAddress}`);
      console.log(`   👤 Name: ${clerkUser.firstName} ${clerkUser.lastName}`);
      console.log(`   📱 Phone: ${clerkUser.phoneNumbers?.[0]?.phoneNumber || 'None'}`);
      console.log(`   🖼️  Avatar: ${clerkUser.imageUrl ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${new Date(clerkUser.createdAt).toISOString()}`);
    } catch (error) {
      console.log('   ❌ User not found in Clerk');
      console.log(`   Error: ${error.message}`);
      process.exit(1);
    }

    // 3. Check if user exists in PostgreSQL
    console.log('\n3. Checking PostgreSQL user...');
    const dbUserResult = await query(`
      SELECT 
        id, email, name, phone, avatar_url, role, status,
        verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [clerkUserId]);

    let dbUser = dbUserResult.rows[0];

    if (dbUser) {
      console.log('   ✅ User found in database');
      console.log(`   📧 Email: ${dbUser.email}`);
      console.log(`   👤 Name: ${dbUser.name}`);
      console.log(`   📱 Phone: ${dbUser.phone || 'None'}`);
      console.log(`   👥 Role: ${dbUser.role}`);
      console.log(`   📊 Status: ${dbUser.status}`);
      console.log(`   ✅ Verified: ${dbUser.verified}`);
      console.log(`   📅 Created: ${dbUser.created_at}`);
      console.log(`   🔄 Updated: ${dbUser.updated_at}`);
    } else {
      console.log('   ❌ User NOT found in database');
      
      // 4. Attempt automatic sync
      console.log('\n4. Attempting automatic sync...');
      try {
        dbUser = await syncUserFromClerk(clerkUserId);
        console.log('   ✅ User synced successfully');
        console.log(`   📧 Email: ${dbUser.email}`);
        console.log(`   👤 Name: ${dbUser.name}`);
        console.log(`   👥 Role: ${dbUser.role}`);
      } catch (syncError) {
        console.log('   ❌ Sync failed');
        console.log(`   Error: ${syncError.message}`);
        process.exit(1);
      }
    }

    // 5. Compare data consistency
    console.log('\n5. Data consistency check...');
    const clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
    const clerkName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
    const clerkPhone = clerkUser.phoneNumbers?.[0]?.phoneNumber;

    let inconsistencies = 0;

    if (dbUser.email !== clerkEmail) {
      console.log(`   ⚠️  Email mismatch: DB(${dbUser.email}) vs Clerk(${clerkEmail})`);
      inconsistencies++;
    } else {
      console.log('   ✅ Email matches');
    }

    if (clerkName && dbUser.name !== clerkName) {
      console.log(`   ⚠️  Name mismatch: DB(${dbUser.name}) vs Clerk(${clerkName})`);
      inconsistencies++;
    } else {
      console.log('   ✅ Name matches');
    }

    if (clerkPhone && dbUser.phone !== clerkPhone) {
      console.log(`   ⚠️  Phone mismatch: DB(${dbUser.phone}) vs Clerk(${clerkPhone})`);
      inconsistencies++;
    } else {
      console.log('   ✅ Phone matches');
    }

    // 6. Check role-specific tables
    console.log('\n6. Checking role-specific data...');
    if (dbUser.role === 'professional') {
      const profResult = await query('SELECT * FROM professionals WHERE user_id = $1', [clerkUserId]);
      if (profResult.rows.length > 0) {
        console.log('   ✅ Professional profile exists');
      } else {
        console.log('   ⚠️  Professional profile missing');
        inconsistencies++;
      }
    } else if (dbUser.role === 'patient') {
      const patientResult = await query('SELECT * FROM patients WHERE user_id = $1', [clerkUserId]);
      if (patientResult.rows.length > 0) {
        console.log('   ✅ Patient profile exists');
      } else {
        console.log('   ⚠️  Patient profile missing');
        inconsistencies++;
      }
    }

    // 7. Check user preferences
    const prefsResult = await query('SELECT * FROM user_preferences WHERE user_id = $1', [clerkUserId]);
    if (prefsResult.rows.length > 0) {
      console.log('   ✅ User preferences exist');
    } else {
      console.log('   ⚠️  User preferences missing');
      inconsistencies++;
    }

    // Final summary
    console.log('\n📋 Summary:');
    if (inconsistencies === 0) {
      console.log('   ✅ User is fully synchronized and consistent');
    } else {
      console.log(`   ⚠️  Found ${inconsistencies} inconsistencies`);
      console.log('   💡 Consider running a manual sync to fix issues');
    }

    console.log('\n🎉 Diagnosis completed!');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  }
};

// Get Clerk User ID from command line arguments
const clerkUserId = process.argv[2];
diagnoseUserSync(clerkUserId);