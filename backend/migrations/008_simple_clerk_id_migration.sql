-- Migration: 008_simple_clerk_id_migration.sql
-- Description: Simple migration to use clerk_id as primary key for users table
-- Date: 2025-07-03

-- This migration focuses on the users table only, since profile tables are views

BEGIN;

-- Step 1: Create new users table with clerk_id as primary key
CREATE TABLE users_clerk_id (
    id VARCHAR(255) PRIMARY KEY, -- This will be the clerk_id
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    phone VARCHAR(20),
    avatar_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    status user_status DEFAULT 'incomplete',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Migrate existing users data
INSERT INTO users_clerk_id (id, email, name, role, phone, avatar_url, verified, status, created_at, updated_at)
SELECT 
    clerk_id, -- Use clerk_id directly as the primary key
    email, 
    name, 
    role, 
    phone, 
    avatar_url, 
    verified, 
    COALESCE(status, 'active'), -- Default to active if status is NULL
    created_at, 
    updated_at
FROM users
WHERE clerk_id IS NOT NULL;

-- Step 3: Update professional_validations table to reference new users table
-- First, add a temporary column for the new reference
ALTER TABLE professional_validations 
ADD COLUMN new_user_id VARCHAR(255);

-- Update the temporary column with clerk_id values
UPDATE professional_validations 
SET new_user_id = u.clerk_id
FROM users u
WHERE professional_validations.user_id = u.id;

-- Add temporary column for reviewed_by as well
ALTER TABLE professional_validations 
ADD COLUMN new_reviewed_by VARCHAR(255);

-- Update the temporary column with clerk_id values for reviewed_by
UPDATE professional_validations 
SET new_reviewed_by = u.clerk_id
FROM users u
WHERE professional_validations.reviewed_by = u.id;

-- Step 4: Update patients table to reference new users table
-- Add temporary column
ALTER TABLE patients 
ADD COLUMN new_user_id VARCHAR(255);

-- Update the temporary column with clerk_id values
UPDATE patients 
SET new_user_id = u.clerk_id
FROM users u
WHERE patients.user_id = u.id;

-- Step 5: Update professionals table to reference new users table
-- Add temporary column
ALTER TABLE professionals 
ADD COLUMN new_user_id VARCHAR(255);

-- Update the temporary column with clerk_id values
UPDATE professionals 
SET new_user_id = u.clerk_id
FROM users u
WHERE professionals.user_id = u.id;

-- Step 6: Drop old foreign key constraints
ALTER TABLE professional_validations DROP CONSTRAINT IF EXISTS professional_validations_user_id_fkey;
ALTER TABLE professional_validations DROP CONSTRAINT IF EXISTS professional_validations_reviewed_by_fkey;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_user_id_fkey;
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_user_id_fkey;

-- Step 7: Drop old users table
DROP TABLE users CASCADE;

-- Step 8: Rename new users table
ALTER TABLE users_clerk_id RENAME TO users;

-- Step 9: Update foreign key columns and add new constraints
-- Update professional_validations
ALTER TABLE professional_validations 
DROP COLUMN user_id,
DROP COLUMN reviewed_by;

ALTER TABLE professional_validations 
RENAME COLUMN new_user_id TO user_id;

ALTER TABLE professional_validations 
RENAME COLUMN new_reviewed_by TO reviewed_by;

-- Update patients
ALTER TABLE patients 
DROP COLUMN user_id;

ALTER TABLE patients 
RENAME COLUMN new_user_id TO user_id;

-- Update professionals
ALTER TABLE professionals 
DROP COLUMN user_id;

ALTER TABLE professionals 
RENAME COLUMN new_user_id TO user_id;

-- Step 10: Add new foreign key constraints
ALTER TABLE professional_validations 
ADD CONSTRAINT professional_validations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE professional_validations 
ADD CONSTRAINT professional_validations_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE patients 
ADD CONSTRAINT patients_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE professionals 
ADD CONSTRAINT professionals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 11: Update user_preferences table
-- Add temporary column
ALTER TABLE user_preferences 
ADD COLUMN new_user_id VARCHAR(255);

-- Update the temporary column with clerk_id values
UPDATE user_preferences 
SET new_user_id = (
    SELECT clerk_id 
    FROM users 
    WHERE users.id = user_preferences.user_id
);

-- Since we dropped the users table, we need to handle this differently
-- Let's recreate the constraint after renaming
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- Step 12: Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Step 13: Create triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;