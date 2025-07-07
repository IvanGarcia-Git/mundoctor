-- Migration 012: Add professional validation system
-- This migration creates the professional validation and document management system

-- Create validation status enum
CREATE TYPE validation_status AS ENUM (
    'pending',
    'under_review', 
    'approved',
    'rejected',
    'requires_more_info'
);

-- Create validation urgency enum
CREATE TYPE validation_urgency AS ENUM (
    'low',
    'medium',
    'high'
);

-- Create document type enum
CREATE TYPE document_type AS ENUM (
    'medical_license',
    'cedula',
    'specialty_certificate',
    'cv',
    'other'
);

-- Create professional validations table
CREATE TABLE IF NOT EXISTS professional_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Validation details
    status validation_status NOT NULL DEFAULT 'pending',
    urgency validation_urgency NOT NULL DEFAULT 'medium',
    notes TEXT,
    
    -- Review information
    review_notes TEXT,
    required_documents JSONB, -- Array of required document types
    reviewed_by VARCHAR(255) REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    expiration_date DATE, -- When the validation expires (for approved validations)
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_review_data CHECK (
        (status IN ('approved', 'rejected', 'requires_more_info') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
        (status IN ('pending', 'under_review'))
    ),
    CONSTRAINT valid_expiration CHECK (
        (status = 'approved' AND expiration_date IS NULL) OR
        (status = 'approved' AND expiration_date > CURRENT_DATE) OR
        (status != 'approved')
    )
);

-- Create validation documents table
CREATE TABLE IF NOT EXISTS validation_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id UUID NOT NULL REFERENCES professional_validations(id) ON DELETE CASCADE,
    
    -- Document details
    document_type document_type NOT NULL,
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    file_path VARCHAR(1000),
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    
    -- Document verification
    is_verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(255) REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255) NOT NULL REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_verification CHECK (
        (is_verified = true AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR
        (is_verified = false)
    ),
    CONSTRAINT valid_file_size CHECK (file_size IS NULL OR file_size > 0)
);

-- Create validation history table for tracking all changes
CREATE TABLE IF NOT EXISTS validation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id UUID NOT NULL REFERENCES professional_validations(id) ON DELETE CASCADE,
    
    -- Change details
    changed_by VARCHAR(255) NOT NULL REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL, -- 'created', 'status_changed', 'documents_added', 'reviewed'
    old_status validation_status,
    new_status validation_status,
    change_reason TEXT,
    change_details JSONB, -- Additional metadata about the change
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_professional_validations_professional_id ON professional_validations(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_validations_status ON professional_validations(status);
CREATE INDEX IF NOT EXISTS idx_professional_validations_urgency ON professional_validations(urgency);
CREATE INDEX IF NOT EXISTS idx_professional_validations_created_at ON professional_validations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_professional_validations_reviewed_by ON professional_validations(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_validation_documents_validation_id ON validation_documents(validation_id);
CREATE INDEX IF NOT EXISTS idx_validation_documents_type ON validation_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_validation_documents_verified ON validation_documents(is_verified);
CREATE INDEX IF NOT EXISTS idx_validation_documents_uploaded_by ON validation_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_validation_history_validation_id ON validation_history(validation_id);
CREATE INDEX IF NOT EXISTS idx_validation_history_changed_by ON validation_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_validation_history_created_at ON validation_history(created_at DESC);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_professional_validations_status_urgency ON professional_validations(status, urgency);
CREATE INDEX IF NOT EXISTS idx_professional_validations_professional_status ON professional_validations(professional_id, status);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_professional_validations_updated_at
    BEFORE UPDATE ON professional_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validation_documents_updated_at
    BEFORE UPDATE ON validation_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to log validation changes
CREATE OR REPLACE FUNCTION log_validation_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO validation_history (
            validation_id, changed_by, change_type, new_status, change_reason, change_details
        ) VALUES (
            NEW.id, 
            NEW.created_by, 
            'created', 
            NEW.status,
            'Validation request created',
            jsonb_build_object(
                'urgency', NEW.urgency,
                'initial_notes', NEW.notes
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO validation_history (
                validation_id, changed_by, change_type, old_status, new_status, change_reason, change_details
            ) VALUES (
                NEW.id,
                COALESCE(NEW.reviewed_by, NEW.created_by),
                'status_changed',
                OLD.status,
                NEW.status,
                CASE 
                    WHEN NEW.status = 'approved' THEN 'Professional validation approved'
                    WHEN NEW.status = 'rejected' THEN 'Professional validation rejected'
                    WHEN NEW.status = 'requires_more_info' THEN 'Additional information requested'
                    WHEN NEW.status = 'under_review' THEN 'Validation under review'
                    ELSE 'Status updated'
                END,
                jsonb_build_object(
                    'review_notes', NEW.review_notes,
                    'required_documents', NEW.required_documents,
                    'expiration_date', NEW.expiration_date
                )
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to log validation changes
CREATE TRIGGER log_validation_changes_trigger
    AFTER INSERT OR UPDATE ON professional_validations
    FOR EACH ROW
    EXECUTE FUNCTION log_validation_changes();

-- Create function to update professional verification status
CREATE OR REPLACE FUNCTION update_professional_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Update professional verification status
        UPDATE professionals 
        SET 
            verified = true,
            verification_date = CURRENT_TIMESTAMP,
            verification_expiry = NEW.expiration_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.professional_id;
        
        -- Also update user status if needed
        UPDATE users 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.professional_id AND status != 'active';
        
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        -- Keep professional unverified but don't change other statuses
        UPDATE professionals 
        SET 
            verified = false,
            verification_date = NULL,
            verification_expiry = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.professional_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update professional verification
CREATE TRIGGER update_professional_verification_trigger
    AFTER UPDATE ON professional_validations
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_professional_verification();

-- Create views for common queries
CREATE OR REPLACE VIEW validation_summary AS
SELECT 
    pv.*,
    u.name as professional_name,
    u.email as professional_email,
    u.phone as professional_phone,
    p.specialties,
    p.location,
    p.verified as currently_verified,
    cb.name as created_by_name,
    rb.name as reviewed_by_name,
    COUNT(vd.id) as documents_count,
    COUNT(CASE WHEN vd.is_verified = true THEN 1 END) as verified_documents_count
FROM professional_validations pv
LEFT JOIN users u ON pv.professional_id = u.id
LEFT JOIN professionals p ON pv.professional_id = p.user_id
LEFT JOIN users cb ON pv.created_by = cb.id
LEFT JOIN users rb ON pv.reviewed_by = rb.id
LEFT JOIN validation_documents vd ON pv.id = vd.validation_id
GROUP BY pv.id, u.name, u.email, u.phone, p.specialties, p.location, p.verified, cb.name, rb.name;

-- Create view for pending validations (admin dashboard)
CREATE OR REPLACE VIEW pending_validations AS
SELECT 
    vs.*,
    EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - vs.created_at)) as days_pending
FROM validation_summary vs
WHERE vs.status = 'pending'
ORDER BY 
    CASE vs.urgency
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
    END,
    vs.created_at ASC;

-- Create view for validation statistics
CREATE OR REPLACE VIEW validation_stats AS
SELECT 
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_count,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN status = 'requires_more_info' THEN 1 END) as requires_info_count,
    AVG(CASE WHEN status IN ('approved', 'rejected') 
        THEN EXTRACT(EPOCH FROM (reviewed_at - created_at))/86400 
        END) as avg_processing_days,
    COUNT(CASE WHEN status = 'pending' AND urgency = 'high' THEN 1 END) as pending_high_priority,
    COUNT(CASE WHEN status = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as pending_over_week
FROM professional_validations
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- Add constraints to ensure data integrity
ALTER TABLE professional_validations 
ADD CONSTRAINT unique_pending_validation_per_professional 
EXCLUDE (professional_id WITH =) 
WHERE (status IN ('pending', 'under_review', 'requires_more_info'));

-- Add comments for documentation
COMMENT ON TABLE professional_validations IS 'Professional validation requests and their status';
COMMENT ON TABLE validation_documents IS 'Documents uploaded for professional validation';
COMMENT ON TABLE validation_history IS 'Audit trail for validation request changes';

COMMENT ON COLUMN professional_validations.urgency IS 'Priority level for processing the validation';
COMMENT ON COLUMN professional_validations.required_documents IS 'JSON array of document types that need to be provided';
COMMENT ON COLUMN professional_validations.expiration_date IS 'When the approved validation expires';

COMMENT ON COLUMN validation_documents.is_verified IS 'Whether the document has been verified by an admin';
COMMENT ON COLUMN validation_documents.file_path IS 'Path to the stored document file';

-- Add some initial data for document categories (if needed)
INSERT INTO validation_documents (validation_id, document_type, filename, description, uploaded_by)
SELECT 
    '00000000-0000-0000-0000-000000000000'::UUID,
    'medical_license',
    'sample_license.pdf',
    'Sample medical license document',
    'system'
WHERE NOT EXISTS (SELECT 1 FROM validation_documents LIMIT 1)
ON CONFLICT DO NOTHING;

-- Clean up sample data
DELETE FROM validation_documents WHERE validation_id = '00000000-0000-0000-0000-000000000000'::UUID;

-- Record migration
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('012', 'Add professional validation system', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;