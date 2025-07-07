-- Migration: 005_use_clerk_id_primary.sql
-- Description: Restructure database to use clerk_id as primary key in users table
-- Date: 2025-07-03

-- This migration will restructure the database to use clerk_id directly as primary key
-- This is more efficient and cleaner for Clerk integration

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

-- Step 2: Create new patient_profiles table with clerk_id reference
CREATE TABLE patient_profiles_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_new(id) ON DELETE CASCADE,
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

-- Step 3: Create new professional_profiles table with clerk_id reference
CREATE TABLE professional_profiles_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_new(id) ON DELETE CASCADE,
    license_number VARCHAR(255) UNIQUE,
    dni VARCHAR(20) UNIQUE,
    specialty VARCHAR(100),
    bio TEXT,
    experience_years INTEGER,
    education JSONB,
    certifications JSONB,
    consultation_fee DECIMAL(10,2),
    available_hours JSONB,
    subscription_plan_id UUID REFERENCES professional_subscriptions(id),
    verified BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create new professional_validations table with clerk_id reference
CREATE TABLE professional_validations_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users_new(id) ON DELETE CASCADE,
    college_number VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    dni_document_url TEXT,
    degree_document_url TEXT,
    certification_document_url TEXT,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
    validation_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255) REFERENCES users_new(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Migrate existing data
INSERT INTO users_new (id, email, name, role, phone, avatar_url, verified, status, created_at, updated_at)
SELECT clerk_id, email, name, role, phone, avatar_url, verified, status, created_at, updated_at
FROM users
WHERE clerk_id IS NOT NULL;

-- Migrate patient profiles (if any exist)
INSERT INTO patient_profiles_new (user_id, date_of_birth, gender, emergency_contact, medical_history, allergies, current_medications, insurance_info, address, created_at, updated_at)
SELECT u.clerk_id, pp.date_of_birth, pp.gender, pp.emergency_contact, pp.medical_history, pp.allergies, pp.current_medications, pp.insurance_info, pp.address, pp.created_at, pp.updated_at
FROM patient_profiles pp
JOIN users u ON pp.user_id = u.id
WHERE u.clerk_id IS NOT NULL;

-- Migrate professional profiles (if any exist)  
INSERT INTO professional_profiles_new (user_id, license_number, dni, specialty, bio, experience_years, education, certifications, consultation_fee, available_hours, verified, profile_completed, created_at, updated_at)
SELECT u.clerk_id, pp.license_number, pp.dni, pp.specialty_name, pp.about, pp.experience_years, pp.education, pp.services, pp.consultation_fee, pp.office_hours, pp.verified, pp.profile_completed, pp.created_at, pp.updated_at
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
WHERE u.clerk_id IS NOT NULL;

-- Migrate professional validations (if any exist)
INSERT INTO professional_validations_new (user_id, college_number, dni, dni_document_url, degree_document_url, certification_document_url, validation_status, validation_notes, submitted_at, reviewed_at, reviewed_by, created_at, updated_at)
SELECT u.clerk_id, pv.college_number, pv.dni, pv.dni_document_url, pv.degree_document_url, pv.certification_document_url, pv.validation_status, pv.validation_notes, pv.submitted_at, pv.reviewed_at, 
       (SELECT u2.clerk_id FROM users u2 WHERE u2.id = pv.reviewed_by), pv.created_at, pv.updated_at
FROM professional_validations pv
JOIN users u ON pv.user_id = u.id
WHERE u.clerk_id IS NOT NULL;

-- Step 6: Drop old tables and rename new ones
DROP TABLE IF EXISTS professional_validations;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS professional_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

ALTER TABLE users_new RENAME TO users;
ALTER TABLE patient_profiles_new RENAME TO patient_profiles;
ALTER TABLE professional_profiles_new RENAME TO professional_profiles;
ALTER TABLE professional_validations_new RENAME TO professional_validations;

-- Step 7: Create indexes for performance
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

-- Step 8: Create triggers for updated_at timestamps
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

-- Step 9: Update user_preferences table to reference new users table
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;