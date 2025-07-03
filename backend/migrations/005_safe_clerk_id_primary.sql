-- Migration: 005_safe_clerk_id_primary.sql
-- Description: Safely restructure database to use clerk_id as primary key
-- Date: 2025-07-03

-- This migration safely restructures the database to use clerk_id as primary key
-- while preserving all existing data

BEGIN;

-- Step 1: Create new users table with clerk_id as primary key
CREATE TABLE users_v2 (
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
INSERT INTO users_v2 (id, email, name, role, phone, avatar_url, verified, status, created_at, updated_at)
SELECT 
    COALESCE(clerk_id, 'legacy_' || id::text), -- Use clerk_id if available, otherwise create legacy ID
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
WHERE clerk_id IS NOT NULL OR id IS NOT NULL;

-- Step 3: Create new profile tables with clerk_id references
CREATE TABLE patient_profiles_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_v2(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20),
    emergency_contact JSONB,
    medical_history JSONB,
    allergies JSONB,
    current_medications JSONB,
    insurance_info JSONB,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE professional_profiles_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_v2(id) ON DELETE CASCADE,
    license_number VARCHAR(255),
    dni VARCHAR(20),
    specialty VARCHAR(100),
    bio TEXT,
    experience_years INTEGER,
    education JSONB,
    certifications JSONB,
    consultation_fee DECIMAL(10,2),
    available_hours JSONB,
    subscription_plan_id UUID,
    verified BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE professional_validations_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_v2(id) ON DELETE CASCADE,
    college_number VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    dni_document_url TEXT,
    degree_document_url TEXT,
    certification_document_url TEXT,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
    validation_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255) REFERENCES users_v2(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Migrate existing profile data (if any exists)
-- Note: Since we're early in development, there might not be much data

-- Migrate patient profiles
INSERT INTO patient_profiles_v2 (user_id, date_of_birth, gender, emergency_contact, medical_history, allergies, current_medications, insurance_info, address, created_at, updated_at)
SELECT 
    COALESCE(u.clerk_id, 'legacy_' || u.id::text),
    pp.date_of_birth, 
    pp.gender, 
    pp.emergency_contact, 
    pp.medical_history, 
    pp.allergies, 
    pp.current_medications, 
    pp.insurance_info, 
    pp.address, 
    pp.created_at, 
    pp.updated_at
FROM patient_profiles pp
JOIN users u ON pp.user_id = u.id
WHERE u.clerk_id IS NOT NULL;

-- Migrate professional profiles  
INSERT INTO professional_profiles_v2 (user_id, license_number, dni, specialty, bio, experience_years, education, certifications, consultation_fee, available_hours, verified, profile_completed, created_at, updated_at)
SELECT 
    COALESCE(u.clerk_id, 'legacy_' || u.id::text),
    pp.license_number,
    pp.dni,
    COALESCE(pp.specialty_name, pp.about), -- Use specialty_name if available, otherwise about
    pp.about,
    pp.experience_years,
    CASE 
        WHEN pp.education IS NOT NULL AND pp.education != '' THEN to_jsonb(pp.education::text)
        ELSE NULL
    END,
    CASE 
        WHEN pp.services IS NOT NULL THEN to_jsonb(pp.services)
        ELSE NULL
    END,
    pp.consultation_fee,
    pp.office_hours,
    pp.verified,
    pp.profile_completed,
    pp.created_at,
    pp.updated_at
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
WHERE u.clerk_id IS NOT NULL;

-- Migrate professional validations
INSERT INTO professional_validations_v2 (user_id, college_number, dni, dni_document_url, degree_document_url, certification_document_url, validation_status, validation_notes, submitted_at, reviewed_at, reviewed_by, created_at, updated_at)
SELECT 
    COALESCE(u.clerk_id, 'legacy_' || u.id::text),
    pv.college_number,
    pv.dni,
    pv.dni_document_url,
    pv.degree_document_url,
    pv.certification_document_url,
    pv.validation_status,
    pv.validation_notes,
    pv.submitted_at,
    pv.reviewed_at,
    CASE 
        WHEN pv.reviewed_by IS NOT NULL THEN COALESCE(u2.clerk_id, 'legacy_' || u2.id::text)
        ELSE NULL
    END,
    pv.created_at,
    pv.updated_at
FROM professional_validations pv
JOIN users u ON pv.user_id = u.id
LEFT JOIN users u2 ON pv.reviewed_by = u2.id
WHERE u.clerk_id IS NOT NULL;

-- Step 5: Update user_preferences table (if it exists and has data)
-- First, let's backup and recreate the user_preferences table
CREATE TABLE user_preferences_v2 AS 
SELECT 
    uuid_generate_v4() as id,
    COALESCE(u.clerk_id, 'legacy_' || u.id::text) as user_id,
    up.theme,
    up.notifications_enabled,
    up.email_notifications,
    up.sms_notifications,
    up.language,
    up.timezone,
    up.created_at,
    up.updated_at
FROM user_preferences up
JOIN users u ON up.user_id = u.id
WHERE u.clerk_id IS NOT NULL;

-- Step 6: Drop old tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS professional_validations CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS professional_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 7: Rename new tables
ALTER TABLE users_v2 RENAME TO users;
ALTER TABLE patient_profiles_v2 RENAME TO patient_profiles;
ALTER TABLE professional_profiles_v2 RENAME TO professional_profiles;
ALTER TABLE professional_validations_v2 RENAME TO professional_validations;

-- Recreate user_preferences table properly
DROP TABLE IF EXISTS user_preferences_v2;
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

-- Step 8: Create indexes for performance
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

-- Step 9: Add foreign key constraint for subscription plans
ALTER TABLE professional_profiles 
ADD CONSTRAINT fk_professional_subscription 
FOREIGN KEY (subscription_plan_id) REFERENCES professional_subscriptions(id);

-- Step 10: Create triggers for updated_at timestamps
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