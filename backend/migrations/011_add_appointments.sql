-- Migration 011: Add appointments and schedule management system
-- This migration creates the complete appointment management system

-- Create appointment status enum
CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'confirmed', 
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled'
);

-- Create appointment type enum
CREATE TYPE appointment_type AS ENUM (
    'consultation',
    'follow_up',
    'emergency',
    'teleconsultation',
    'home_visit',
    'routine_checkup'
);

-- Create schedule day enum
CREATE TYPE schedule_day AS ENUM (
    'monday',
    'tuesday', 
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    is_virtual BOOLEAN DEFAULT false,
    location_address TEXT,
    meeting_url TEXT,
    meeting_id VARCHAR(255),
    
    -- Pricing
    fee DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    -- Metadata
    notes TEXT,
    internal_notes TEXT, -- Only visible to professional
    cancellation_reason TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_appointment_time CHECK (start_time < end_time),
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT valid_fee CHECK (fee >= 0),
    CONSTRAINT valid_future_date CHECK (scheduled_date >= CURRENT_DATE OR status IN ('completed', 'cancelled'))
);

-- Create professional services table
CREATE TABLE IF NOT EXISTS professional_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Service details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Timing and pricing
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    is_virtual_available BOOLEAN DEFAULT true,
    is_in_person_available BOOLEAN DEFAULT true,
    
    -- Requirements
    requires_preparation BOOLEAN DEFAULT false,
    preparation_instructions TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT valid_fee CHECK (base_fee >= 0)
);

-- Create professional schedules table
CREATE TABLE IF NOT EXISTS professional_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Schedule details
    day_of_week schedule_day NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    
    -- Break times (optional)
    break_start_time TIME,
    break_end_time TIME,
    
    -- Metadata
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_schedule_time CHECK (start_time < end_time),
    CONSTRAINT valid_break_time CHECK (
        (break_start_time IS NULL AND break_end_time IS NULL) OR
        (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND 
         break_start_time < break_end_time AND 
         break_start_time >= start_time AND 
         break_end_time <= end_time)
    ),
    CONSTRAINT valid_effective_dates CHECK (effective_until IS NULL OR effective_from <= effective_until)
);

-- Create schedule exceptions table (holidays, vacations, special hours)
CREATE TABLE IF NOT EXISTS schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Exception details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exception_date DATE NOT NULL,
    
    -- Exception type
    is_available BOOLEAN DEFAULT false, -- false = not available, true = special hours
    start_time TIME, -- NULL if not available all day
    end_time TIME,   -- NULL if not available all day
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_exception_time CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

-- Create appointment history table for tracking changes
CREATE TABLE IF NOT EXISTS appointment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Change details
    changed_by VARCHAR(255) NOT NULL REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'cancelled', 'rescheduled'
    old_values JSONB,
    new_values JSONB,
    change_reason TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_date ON appointments(professional_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(scheduled_date, start_time);

CREATE INDEX IF NOT EXISTS idx_professional_services_professional_id ON professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_active ON professional_services(is_active);
CREATE INDEX IF NOT EXISTS idx_professional_services_category ON professional_services(category);

CREATE INDEX IF NOT EXISTS idx_professional_schedules_professional_id ON professional_schedules(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_schedules_day ON professional_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_professional_schedules_effective ON professional_schedules(effective_from, effective_until);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_professional_id ON schedule_exceptions(professional_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON schedule_exceptions(exception_date);

CREATE INDEX IF NOT EXISTS idx_appointment_history_appointment_id ON appointment_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_history_changed_by ON appointment_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_appointment_history_created_at ON appointment_history(created_at DESC);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_professional_status_date ON appointments(professional_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status_date ON appointments(patient_id, status, scheduled_date);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_services_updated_at
    BEFORE UPDATE ON professional_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_schedules_updated_at
    BEFORE UPDATE ON professional_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_exceptions_updated_at
    BEFORE UPDATE ON schedule_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for overlapping appointments for the same professional
    SELECT COUNT(*)
    INTO conflict_count
    FROM appointments
    WHERE professional_id = NEW.professional_id
      AND scheduled_date = NEW.scheduled_date
      AND status IN ('scheduled', 'confirmed', 'in_progress')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND (
          (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
          (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
          (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      );
    
    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Appointment conflict detected for professional % on % at %-%', 
            NEW.professional_id, NEW.scheduled_date, NEW.start_time, NEW.end_time;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to check conflicts
CREATE TRIGGER check_appointment_conflicts_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION check_appointment_conflicts();

-- Create function to log appointment changes
CREATE OR REPLACE FUNCTION log_appointment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO appointment_history (
            appointment_id, changed_by, change_type, new_values, change_reason
        ) VALUES (
            NEW.id, 
            NEW.created_by, 
            'created', 
            row_to_json(NEW),
            'Appointment created'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO appointment_history (
            appointment_id, changed_by, change_type, old_values, new_values, change_reason
        ) VALUES (
            NEW.id,
            NEW.created_by, -- In real implementation, this should be the current user
            CASE 
                WHEN OLD.status != NEW.status AND NEW.status = 'cancelled' THEN 'cancelled'
                WHEN OLD.scheduled_date != NEW.scheduled_date OR OLD.start_time != NEW.start_time THEN 'rescheduled'
                ELSE 'updated'
            END,
            row_to_json(OLD),
            row_to_json(NEW),
            CASE 
                WHEN OLD.status != NEW.status AND NEW.status = 'cancelled' THEN NEW.cancellation_reason
                ELSE 'Appointment updated'
            END
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to log changes
CREATE TRIGGER log_appointment_changes_trigger
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION log_appointment_changes();

-- Create views for common queries
CREATE OR REPLACE VIEW appointment_details AS
SELECT 
    a.*,
    pp.name as professional_name,
    pp.email as professional_email,
    pt.name as patient_name,
    pt.email as patient_email,
    ps.name as service_name,
    ps.category as service_category
FROM appointments a
LEFT JOIN users pp ON a.professional_id = pp.id
LEFT JOIN users pt ON a.patient_id = pt.id
LEFT JOIN professional_services ps ON a.service_id = ps.id;

-- Create view for professional availability
CREATE OR REPLACE VIEW professional_availability AS
SELECT 
    ps.professional_id,
    ps.day_of_week,
    ps.start_time,
    ps.end_time,
    ps.break_start_time,
    ps.break_end_time,
    ps.is_available,
    ps.timezone,
    ps.effective_from,
    ps.effective_until,
    u.name as professional_name
FROM professional_schedules ps
JOIN users u ON ps.professional_id = u.id
WHERE ps.is_available = true
  AND (ps.effective_until IS NULL OR ps.effective_until >= CURRENT_DATE)
  AND ps.effective_from <= CURRENT_DATE;

-- Create view for upcoming appointments
CREATE OR REPLACE VIEW upcoming_appointments AS
SELECT 
    ad.*
FROM appointment_details ad
WHERE ad.scheduled_date >= CURRENT_DATE
  AND ad.status IN ('scheduled', 'confirmed')
ORDER BY ad.scheduled_date, ad.start_time;

-- Add constraints to ensure data integrity
ALTER TABLE appointments ADD CONSTRAINT unique_professional_time_slot 
    EXCLUDE USING gist (
        professional_id WITH =,
        scheduled_date WITH =,
        tsrange(
            (scheduled_date + start_time)::timestamp,
            (scheduled_date + end_time)::timestamp
        ) WITH &&
    ) WHERE (status IN ('scheduled', 'confirmed', 'in_progress'));

-- Add comments for documentation
COMMENT ON TABLE appointments IS 'Main appointments table with complete scheduling information';
COMMENT ON TABLE professional_services IS 'Services offered by professionals with pricing and duration';
COMMENT ON TABLE professional_schedules IS 'Regular weekly schedules for professionals';
COMMENT ON TABLE schedule_exceptions IS 'Exceptions to regular schedules (holidays, special hours)';
COMMENT ON TABLE appointment_history IS 'Audit trail for appointment changes';

-- Insert some default professional services categories
INSERT INTO professional_services (professional_id, name, description, category, duration_minutes, base_fee)
SELECT 
    p.user_id,
    'Consulta General',
    'Consulta médica general',
    'consultation',
    30,
    50.00
FROM professionals p
WHERE NOT EXISTS (
    SELECT 1 FROM professional_services ps WHERE ps.professional_id = p.user_id
)
ON CONFLICT DO NOTHING;

-- Insert default schedules for professionals (Monday to Friday, 9 AM to 5 PM)
INSERT INTO professional_schedules (professional_id, day_of_week, start_time, end_time, break_start_time, break_end_time)
SELECT 
    p.user_id,
    unnest(ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::schedule_day[]),
    '09:00'::TIME,
    '17:00'::TIME,
    '13:00'::TIME,
    '14:00'::TIME
FROM professionals p
WHERE NOT EXISTS (
    SELECT 1 FROM professional_schedules ps WHERE ps.professional_id = p.user_id
)
ON CONFLICT DO NOTHING;

-- Record migration
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('011', 'Add appointments and schedule management system', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;