-- Migration: 009_clean_clerk_id_migration.sql
-- Description: Clean migration to use clerk_id as primary key for users table
-- Date: 2025-07-03

-- This migration changes the users table to use clerk_id as primary key
-- and updates all foreign key references

BEGIN;

-- Step 1: Create new users table with clerk_id as primary key
CREATE TABLE users_new (
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
INSERT INTO users_new (id, email, name, role, phone, avatar_url, verified, status, created_at, updated_at)
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

-- Step 3: Drop all foreign key constraints that reference users table
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_cancelled_by_fkey;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_user_id_fkey;
ALTER TABLE professional_validations DROP CONSTRAINT IF EXISTS professional_validations_reviewed_by_fkey;
ALTER TABLE professional_validations DROP CONSTRAINT IF EXISTS professional_validations_user_id_fkey;
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_user_id_fkey;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- Step 4: Drop old users table
DROP TABLE users CASCADE;

-- Step 5: Rename new users table
ALTER TABLE users_new RENAME TO users;

-- Step 6: Update foreign key column types to match new primary key
-- Since all tables are empty, we can safely alter the column types
ALTER TABLE appointments ALTER COLUMN cancelled_by TYPE VARCHAR(255);
ALTER TABLE patients ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE professional_validations ALTER COLUMN reviewed_by TYPE VARCHAR(255);
ALTER TABLE professional_validations ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE professionals ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE support_tickets ALTER COLUMN assigned_to TYPE VARCHAR(255);
ALTER TABLE support_tickets ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE user_preferences ALTER COLUMN user_id TYPE VARCHAR(255);

-- Step 7: Add back foreign key constraints
ALTER TABLE appointments 
ADD CONSTRAINT appointments_cancelled_by_fkey 
FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE patients 
ADD CONSTRAINT patients_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE professional_validations 
ADD CONSTRAINT professional_validations_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE professional_validations 
ADD CONSTRAINT professional_validations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE professionals 
ADD CONSTRAINT professionals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE support_tickets 
ADD CONSTRAINT support_tickets_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE support_tickets 
ADD CONSTRAINT support_tickets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_preferences 
ADD CONSTRAINT user_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 8: Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Step 9: Create triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;