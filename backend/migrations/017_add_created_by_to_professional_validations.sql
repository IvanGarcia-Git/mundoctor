-- Migration: 017_add_created_by_to_professional_validations.sql
-- Description: Add created_by column to professional_validations table and update validation_status enum

ALTER TABLE professional_validations
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE professional_validations
DROP CONSTRAINT professional_validations_validation_status_check;

ALTER TABLE professional_validations
ADD CONSTRAINT professional_validations_validation_status_check
CHECK (validation_status IN ('pending', 'under_review', 'approved', 'rejected', 'requires_more_info'));

-- Optional: Update existing rows to set created_by if applicable (e.g., to a default admin user ID)
-- UPDATE professional_validations SET created_by = 'your_admin_user_id' WHERE created_by IS NULL;
