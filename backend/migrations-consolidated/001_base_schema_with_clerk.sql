-- Consolidated Migration 001: Base Schema with Clerk Integration
-- This migration consolidates migrations 001-009 into a single coherent schema
-- Date: 2025-01-09
-- Description: Creates the complete base schema with Clerk authentication integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('patient', 'professional', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('incomplete', 'pending_validation', 'active', 'suspended', 'deleted');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE appointment_type AS ENUM ('consultation', 'follow_up', 'emergency', 'teleconsultation', 'home_visit', 'routine_checkup');
CREATE TYPE consultation_type AS ENUM ('virtual', 'in_person');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium', 'enterprise');
CREATE TYPE schedule_day AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE validation_status AS ENUM ('pending', 'approved', 'rejected', 'requires_info');

-- Users table - Primary table using Clerk ID as primary key
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY, -- Clerk ID as primary key
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'patient',
    status user_status DEFAULT 'incomplete',
    verified BOOLEAN DEFAULT FALSE,
    stripe_customer_id VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_users_phone_format CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Specialties table - Medical specialties
CREATE TABLE specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patient profiles table - Patient-specific information
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    blood_type VARCHAR(5) CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    allergies TEXT,
    medical_conditions TEXT,
    medications TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Spain',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Professional profiles table - Healthcare professionals information
CREATE TABLE professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(255) UNIQUE,
    dni VARCHAR(20) UNIQUE,
    specialty_id UUID REFERENCES specialties(id),
    subscription_plan subscription_plan DEFAULT 'free',
    consultation_fee DECIMAL(10,2),
    city VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    office_hours JSONB,
    about TEXT,
    education JSONB,
    experience_years INTEGER,
    languages TEXT[],
    verified BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_professional_rating CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT chk_professional_experience CHECK (experience_years >= 0 AND experience_years <= 70),
    CONSTRAINT chk_professional_fee CHECK (consultation_fee >= 0)
);

-- Professional validations table - Document validation system
CREATE TABLE professional_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    dni_document_url TEXT,
    degree_document_url TEXT,
    certification_document_url TEXT,
    validation_status validation_status DEFAULT 'pending',
    validation_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Professional services table - Services offered by professionals
CREATE TABLE professional_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT TRUE,
    is_virtual_available BOOLEAN DEFAULT TRUE,
    is_in_person_available BOOLEAN DEFAULT TRUE,
    requires_preparation BOOLEAN DEFAULT FALSE,
    preparation_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_service_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT chk_service_fee CHECK (base_fee >= 0)
);

-- Professional schedules table - Regular weekly schedules
CREATE TABLE professional_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    day_of_week schedule_day NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    break_start_time TIME,
    break_end_time TIME,
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_schedule_time CHECK (start_time < end_time),
    CONSTRAINT chk_break_time CHECK (
        (break_start_time IS NULL AND break_end_time IS NULL) OR
        (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND 
         break_start_time < break_end_time AND 
         break_start_time >= start_time AND 
         break_end_time <= end_time)
    ),
    CONSTRAINT chk_effective_dates CHECK (effective_until IS NULL OR effective_from <= effective_until)
);

-- Schedule exceptions table - Holidays, vacations, special hours
CREATE TABLE schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exception_date DATE NOT NULL,
    is_available BOOLEAN DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_exception_time CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

-- Appointments table - Complete appointment management
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES professional_services(id) ON DELETE SET NULL,
    
    -- Appointment details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    appointment_type appointment_type NOT NULL DEFAULT 'consultation',
    status appointment_status NOT NULL DEFAULT 'scheduled',
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    
    -- Location and mode
    is_virtual BOOLEAN DEFAULT FALSE,
    location_address TEXT,
    meeting_url TEXT,
    meeting_id VARCHAR(255),
    
    -- Medical information
    patient_symptoms TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    prescriptions TEXT,
    
    -- Pricing
    fee DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    -- Metadata
    notes TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_appointment_time CHECK (start_time < end_time),
    CONSTRAINT chk_appointment_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT chk_appointment_fee CHECK (fee >= 0),
    CONSTRAINT chk_future_date CHECK (scheduled_date >= CURRENT_DATE OR status IN ('completed', 'cancelled'))
);

-- Appointment history table - Track changes
CREATE TABLE appointment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    changed_by VARCHAR(255) NOT NULL REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency contacts table - Patient emergency contacts
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patient favorites table - Favorite professionals
CREATE TABLE patient_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    professional_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(patient_id, professional_id)
);

-- User preferences table - User-specific settings
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table - Session tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Schema migrations table - Track applied migrations
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Professional profiles indexes
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_specialty ON professional_profiles(specialty_id);
CREATE INDEX idx_professional_profiles_city ON professional_profiles(city);
CREATE INDEX idx_professional_profiles_verified ON professional_profiles(verified);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(rating DESC);
CREATE INDEX idx_professional_profiles_location ON professional_profiles(latitude, longitude);

-- Patient profiles indexes
CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_patient_profiles_city ON patient_profiles(city);

-- Appointments indexes
CREATE INDEX idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_professional_date ON appointments(professional_id, scheduled_date);
CREATE INDEX idx_appointments_patient_date ON appointments(patient_id, scheduled_date);
CREATE INDEX idx_appointments_datetime ON appointments(scheduled_date, start_time);
CREATE INDEX idx_appointments_professional_status_date ON appointments(professional_id, status, scheduled_date);

-- Services indexes
CREATE INDEX idx_professional_services_professional_id ON professional_services(professional_id);
CREATE INDEX idx_professional_services_active ON professional_services(is_active);
CREATE INDEX idx_professional_services_category ON professional_services(category);

-- Schedules indexes
CREATE INDEX idx_professional_schedules_professional_id ON professional_schedules(professional_id);
CREATE INDEX idx_professional_schedules_day ON professional_schedules(day_of_week);
CREATE INDEX idx_professional_schedules_effective ON professional_schedules(effective_from, effective_until);

-- Validations indexes
CREATE INDEX idx_professional_validations_user_id ON professional_validations(user_id);
CREATE INDEX idx_professional_validations_status ON professional_validations(validation_status);
CREATE INDEX idx_professional_validations_submitted ON professional_validations(submitted_at);

-- Session indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity DESC);

-- Create unique constraints
CREATE UNIQUE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE UNIQUE INDEX idx_professional_profiles_user ON professional_profiles(user_id);
CREATE UNIQUE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- Create composite indexes for common queries
CREATE INDEX idx_appointments_prof_status_date ON appointments(professional_id, status, scheduled_date);
CREATE INDEX idx_appointments_patient_status_date ON appointments(patient_id, status, scheduled_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specialties_updated_at 
    BEFORE UPDATE ON specialties 
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

CREATE TRIGGER update_professional_services_updated_at 
    BEFORE UPDATE ON professional_services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_schedules_updated_at 
    BEFORE UPDATE ON professional_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_exceptions_updated_at 
    BEFORE UPDATE ON schedule_exceptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at 
    BEFORE UPDATE ON emergency_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default specialties
INSERT INTO specialties (name, description, icon) VALUES 
('Medicina General', 'Atención médica general y preventiva', 'stethoscope'),
('Cardiología', 'Especialista en enfermedades del corazón', 'heart'),
('Dermatología', 'Especialista en enfermedades de la piel', 'skin'),
('Neurología', 'Especialista en sistema nervioso', 'brain'),
('Pediatría', 'Atención médica para niños', 'baby'),
('Ginecología', 'Salud femenina y reproductiva', 'female'),
('Psicología', 'Salud mental y bienestar emocional', 'brain'),
('Traumatología', 'Lesiones y enfermedades del sistema musculoesquelético', 'bone'),
('Oftalmología', 'Especialista en enfermedades de los ojos', 'eye'),
('Odontología', 'Cuidado dental y oral', 'tooth'),
('Endocrinología', 'Especialista en hormonas y metabolismo', 'hormone'),
('Neumología', 'Especialista en enfermedades respiratorias', 'lungs'),
('Urología', 'Especialista en sistema urinario', 'kidney'),
('Gastroenterología', 'Especialista en sistema digestivo', 'stomach'),
('Psiquiatría', 'Salud mental y trastornos psiquiátricos', 'brain-mental')
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE users IS 'Main users table with Clerk ID as primary key';
COMMENT ON TABLE professional_profiles IS 'Healthcare professionals profiles and information';
COMMENT ON TABLE patient_profiles IS 'Patient profiles and medical information';
COMMENT ON TABLE appointments IS 'Appointment management with complete scheduling information';
COMMENT ON TABLE professional_services IS 'Services offered by professionals with pricing';
COMMENT ON TABLE professional_schedules IS 'Regular weekly schedules for professionals';
COMMENT ON TABLE professional_validations IS 'Professional credentials validation system';

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Base schema with Clerk integration - consolidates migrations 001-009');

-- Log completion
SELECT 'Consolidated migration 001 completed successfully' AS status;