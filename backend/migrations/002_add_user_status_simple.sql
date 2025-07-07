-- Migration: 002_add_user_status_simple.sql
-- Description: Add user status field for tracking user completion states
-- Date: 2025-07-03

-- Create user status type
CREATE TYPE user_status AS ENUM ('incomplete', 'pending_validation', 'active');

-- Add status column to users table
ALTER TABLE users 
ADD COLUMN status user_status DEFAULT 'incomplete';

-- Update existing users to have appropriate status
-- Patients are active by default after Clerk registration
UPDATE users 
SET status = 'active'
WHERE role = 'patient';

-- Admins are active by default
UPDATE users 
SET status = 'active'
WHERE role = 'admin';

-- Professionals start as incomplete and need to complete profile
UPDATE users 
SET status = 'incomplete'
WHERE role = 'professional';

-- Create index for user status
CREATE INDEX idx_users_status ON users(status);