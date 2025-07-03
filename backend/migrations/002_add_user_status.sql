-- Migration: 002_add_user_status.sql
-- Description: Add user status field for tracking user completion states
-- Date: 2025-07-03

-- Create user status type
CREATE TYPE user_status AS ENUM ('incomplete', 'pending_validation', 'active');

-- Add status column to users table
ALTER TABLE users 
ADD COLUMN status user_status DEFAULT 'incomplete';

-- Update existing users to have appropriate status
UPDATE users 
SET status = CASE 
    WHEN role = 'patient' THEN 'active'
    WHEN role = 'professional' THEN (
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM professionals p 
                WHERE p.user_id = users.id 
                AND p.profile_completed = TRUE 
                AND p.verified = TRUE
            ) THEN 'active'
            WHEN EXISTS (
                SELECT 1 FROM professionals p 
                WHERE p.user_id = users.id 
                AND p.profile_completed = TRUE 
                AND p.verified = FALSE
            ) THEN 'pending_validation'
            ELSE 'incomplete'
        END
    )
    ELSE 'active'
END;

-- Create index for user status
CREATE INDEX idx_users_status ON users(status);

-- Update the update trigger to include status
-- (The trigger already exists and will automatically handle the new column)