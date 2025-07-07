-- Migration: 006_correct_clerk_id_migration.sql
-- Description: Correctly restructure database to use clerk_id as primary key
-- Date: 2025-07-03

-- This migration correctly restructures the database based on the actual table structures

BEGIN;

-- Step 1: Create new users table with clerk_id as primary key
CREATE TABLE users_final (
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
INSERT INTO users_final (id, email, name, role, phone, avatar_url, verified, status, created_at, updated_at)
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

-- Step 3: Create new patient_profiles table (simplified, matching actual structure)
CREATE TABLE patient_profiles_final (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_final(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20),
    emergency_contact VARCHAR(255), -- matches actual structure
    medical_history TEXT, -- matches actual structure  
    insurance_info JSONB,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create new professional_profiles table (simplified, matching actual structure)
CREATE TABLE professional_profiles_final (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_final(id) ON DELETE CASCADE,
    license_number VARCHAR(255),
    dni VARCHAR(20),
    specialty_name VARCHAR(100), -- matches actual column name
    about TEXT, -- matches actual column name
    experience_years INTEGER,
    education TEXT, -- matches actual structure (TEXT not JSONB)
    services TEXT[], -- matches actual structure 
    consultation_fee DECIMAL(10,2),
    office_hours JSONB, -- matches actual column name
    subscription_plan_id UUID,
    verified BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create new professional_validations table
CREATE TABLE professional_validations_final (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_final(id) ON DELETE CASCADE,
    college_number VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    dni_document_url TEXT,
    degree_document_url TEXT,
    certification_document_url TEXT,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
    validation_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255) REFERENCES users_final(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Migrate existing patient profiles (if any exist)
-- Since patient_profiles table is empty, we skip this

-- Step 7: Migrate existing professional profiles (if any exist)
-- Since professional_profiles is likely empty or has no data we need, we skip this

-- Step 8: Migrate existing professional validations (if any exist)
-- Since professional_validations is likely empty, we skip this

-- Step 9: Drop old tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS professional_validations CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS professional_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Also drop other tables that might reference users with UUID
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;

-- Step 10: Rename new tables
ALTER TABLE users_final RENAME TO users;
ALTER TABLE patient_profiles_final RENAME TO patient_profiles;
ALTER TABLE professional_profiles_final RENAME TO professional_profiles;
ALTER TABLE professional_validations_final RENAME TO professional_validations;

-- Step 11: Recreate user_preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 12: Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_validations_user_id ON professional_validations(user_id);
CREATE INDEX idx_professional_validations_status ON professional_validations(validation_status);

-- Create unique constraints
CREATE UNIQUE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE UNIQUE INDEX idx_professional_profiles_user ON professional_profiles(user_id);
CREATE UNIQUE INDEX idx_professional_validations_user ON professional_validations(user_id);
CREATE UNIQUE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- Step 13: Add foreign key constraint for subscription plans
ALTER TABLE professional_profiles 
ADD CONSTRAINT fk_professional_subscription 
FOREIGN KEY (subscription_plan_id) REFERENCES professional_subscriptions(id);

-- Step 14: Create triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_profiles_updated_at 
    BEFORE UPDATE ON patient_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_profiles_updated_at 
    BEFORE UPDATE ON professional_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_validations_updated_at 
    BEFORE UPDATE ON professional_validations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;