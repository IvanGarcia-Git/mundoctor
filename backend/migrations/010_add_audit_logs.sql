-- Migration 010: Add audit logs table for comprehensive security logging
-- This table will track all user actions, security events, and system changes

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_timestamp ON audit_logs(risk_level, timestamp DESC) WHERE risk_level IN ('high', 'critical');

-- Create partial index for failed operations
CREATE INDEX IF NOT EXISTS idx_audit_logs_failures ON audit_logs(timestamp DESC, action, user_id) WHERE success = false;

-- Add user preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    notifications_enabled BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add session tracking table for audit purposes
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for session tracking
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to user_preferences table
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraints to ensure data integrity
ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_logs_resource_not_empty CHECK (resource != '');
ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_logs_action_not_empty CHECK (action != '');

-- Add function to clean up old audit logs (for compliance)
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
    
    -- Only delete low and medium risk logs, keep high and critical indefinitely
    DELETE FROM audit_logs 
    WHERE timestamp < cutoff_date 
    AND risk_level IN ('low', 'medium');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for security monitoring
CREATE OR REPLACE VIEW security_events AS
SELECT 
    al.*,
    u.email,
    u.role,
    u.name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.risk_level IN ('high', 'critical')
   OR al.success = false
   OR al.action IN ('login_failed', 'unauthorized_access', 'suspicious_activity')
ORDER BY al.timestamp DESC;

-- Create a view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    COUNT(al.id) as total_activities,
    COUNT(al.id) FILTER (WHERE al.timestamp >= CURRENT_DATE - INTERVAL '7 days') as activities_last_7_days,
    COUNT(al.id) FILTER (WHERE al.timestamp >= CURRENT_DATE - INTERVAL '30 days') as activities_last_30_days,
    MAX(al.timestamp) as last_activity,
    COUNT(al.id) FILTER (WHERE al.success = false) as failed_activities,
    COUNT(al.id) FILTER (WHERE al.risk_level IN ('high', 'critical')) as high_risk_activities
FROM users u
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.email, u.name, u.role;

-- Add comment to document the migration
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for security compliance and monitoring';
COMMENT ON TABLE user_preferences IS 'User-specific application preferences and settings';
COMMENT ON TABLE user_sessions IS 'User session tracking for security and analytics';
COMMENT ON VIEW security_events IS 'View of high-risk and failed security events for monitoring';
COMMENT ON VIEW user_activity_summary IS 'Summary of user activity patterns for analytics';

-- Insert initial migration record
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('010', 'Add audit logs and session tracking', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;