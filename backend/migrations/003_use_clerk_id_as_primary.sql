-- Migration: 003_use_clerk_id_as_primary.sql
-- Description: Change users table to use clerk_id as primary key and update relationships
-- Date: 2025-07-03

-- This migration will modify the database to use clerk_id as the primary key
-- and update all related tables to reference it

-- Step 1: Create new tables with clerk_id references

-- Create new patient_profiles table (replacing patients)
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(clerk_id) ON DELETE CASCADE,
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

-- Create new professional_profiles table (replacing professionals) 
CREATE TABLE professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(clerk_id) ON DELETE CASCADE,
    license_number VARCHAR(255) UNIQUE NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
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

-- Create professional_validations table for document validation
CREATE TABLE professional_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(clerk_id) ON DELETE CASCADE,
    college_number VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    dni_document_url TEXT,
    degree_document_url TEXT,
    certification_document_url TEXT,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
    validation_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255) REFERENCES users(clerk_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professional_subscriptions table
CREATE TABLE professional_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    features JSONB,
    max_appointments INTEGER,
    max_patients INTEGER,
    analytics_enabled BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add subscription plan reference to professional_profiles
ALTER TABLE professional_profiles 
ADD CONSTRAINT fk_professional_subscription 
FOREIGN KEY (subscription_plan_id) REFERENCES professional_subscriptions(id);

-- Create indexes for performance
CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_validations_user_id ON professional_validations(user_id);
CREATE INDEX idx_professional_validations_status ON professional_validations(validation_status);

-- Create unique constraints
CREATE UNIQUE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE UNIQUE INDEX idx_professional_profiles_user ON professional_profiles(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_patient_profiles_updated_at 
    BEFORE UPDATE ON patient_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_profiles_updated_at 
    BEFORE UPDATE ON professional_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_validations_updated_at 
    BEFORE UPDATE ON professional_validations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO professional_subscriptions (name, description, price, features, max_appointments, max_patients, analytics_enabled, priority_support) VALUES
('free', 'Plan Gratuito', 0.00, '["Perfil básico", "Hasta 10 citas/mes"]', 10, 50, false, false),
('basic', 'Plan Básico', 29.99, '["Perfil completo", "Hasta 50 citas/mes", "Recordatorios automáticos"]', 50, 200, false, false),
('premium', 'Plan Premium', 59.99, '["Perfil premium", "Citas ilimitadas", "Analytics básicos", "Soporte prioritario"]', -1, -1, true, true),
('enterprise', 'Plan Empresarial', 99.99, '["Todas las funciones", "Analytics avanzados", "API access", "Soporte 24/7"]', -1, -1, true, true);