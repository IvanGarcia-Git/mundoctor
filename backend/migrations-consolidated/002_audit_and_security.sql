-- Consolidated Migration 002: Audit and Security System
-- This migration consolidates audit logging and security features
-- Date: 2025-01-09
-- Description: Implements comprehensive audit logging and security tracking

-- Audit logs table for comprehensive security logging
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_audit_logs_resource_not_empty CHECK (resource != ''),
    CONSTRAINT chk_audit_logs_action_not_empty CHECK (action != '')
);

-- Security events view for monitoring
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

-- User activity summary view
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

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC);
CREATE INDEX idx_audit_logs_risk_timestamp ON audit_logs(risk_level, timestamp DESC) WHERE risk_level IN ('high', 'critical');

-- Partial index for failed operations
CREATE INDEX idx_audit_logs_failures ON audit_logs(timestamp DESC, action, user_id) WHERE success = false;

-- Function to clean up old audit logs (HIPAA compliance)
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 2190) -- 6 years
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

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id VARCHAR(255),
    p_action VARCHAR(100),
    p_resource VARCHAR(100),
    p_resource_id VARCHAR(255) DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_risk_level VARCHAR(20) DEFAULT 'low',
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource, resource_id, details, 
        ip_address, user_agent, risk_level, success, error_message
    ) VALUES (
        p_user_id, p_action, p_resource, p_resource_id, p_details,
        p_ip_address, p_user_agent, p_risk_level, p_success, p_error_message
    ) RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Data retention configuration table
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type VARCHAR(100) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default retention policies (HIPAA compliant)
INSERT INTO data_retention_policies (data_type, retention_days, description) VALUES
('audit_logs', 2190, '6 years retention for audit logs (HIPAA compliance)'),
('medical_records', 2555, '7 years retention for medical records'),
('user_sessions', 30, '30 days retention for user sessions'),
('error_logs', 90, '90 days retention for error logs'),
('access_logs', 365, '1 year retention for access logs'),
('payment_records', 2555, '7 years retention for payment records'),
('appointment_history', 2555, '7 years retention for appointment history');

-- Security configuration table
CREATE TABLE security_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    last_modified_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default security configuration
INSERT INTO security_config (config_key, config_value, description) VALUES
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('lockout_duration_minutes', '15', 'Account lockout duration in minutes'),
('password_min_length', '8', 'Minimum password length'),
('session_timeout_minutes', '60', 'Session timeout in minutes'),
('require_2fa_for_admin', 'true', 'Require 2FA for admin accounts'),
('ip_whitelist_enabled', 'false', 'Enable IP whitelisting'),
('rate_limit_requests_per_minute', '60', 'Rate limit per minute per user'),
('audit_all_actions', 'true', 'Audit all user actions'),
('encrypt_sensitive_data', 'true', 'Encrypt sensitive data at rest');

-- Failed login attempts tracking
CREATE TABLE failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(100),
    
    -- Index for cleanup
    INDEX idx_failed_attempts_time (attempt_time),
    INDEX idx_failed_attempts_email (email),
    INDEX idx_failed_attempts_ip (ip_address)
);

-- IP whitelist table
CREATE TABLE ip_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(ip_address)
);

-- Security events table for real-time monitoring
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id VARCHAR(255) REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    event_details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(255) REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_security_events_type (event_type),
    INDEX idx_security_events_severity (severity),
    INDEX idx_security_events_user_id (user_id),
    INDEX idx_security_events_created_at (created_at DESC),
    INDEX idx_security_events_unresolved (resolved) WHERE resolved = false
);

-- Function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity(
    p_user_id VARCHAR(255),
    p_ip_address INET,
    p_action VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    recent_failures INTEGER;
    different_ips INTEGER;
    rapid_actions INTEGER;
BEGIN
    -- Check for recent failed login attempts
    SELECT COUNT(*) INTO recent_failures
    FROM failed_login_attempts fla
    JOIN users u ON fla.email = u.email
    WHERE u.id = p_user_id
    AND fla.attempt_time > CURRENT_TIMESTAMP - INTERVAL '15 minutes';
    
    -- Check for access from multiple IPs
    SELECT COUNT(DISTINCT ip_address) INTO different_ips
    FROM audit_logs
    WHERE user_id = p_user_id
    AND timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    -- Check for rapid consecutive actions
    SELECT COUNT(*) INTO rapid_actions
    FROM audit_logs
    WHERE user_id = p_user_id
    AND timestamp > CURRENT_TIMESTAMP - INTERVAL '1 minute';
    
    -- Return true if suspicious activity detected
    RETURN (recent_failures > 3 OR different_ips > 3 OR rapid_actions > 30);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create security events
CREATE OR REPLACE FUNCTION create_security_event_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Create security event for failed authentication
    IF NEW.action = 'login_failed' OR NEW.success = false THEN
        INSERT INTO security_events (
            event_type, severity, user_id, ip_address, user_agent, event_details
        ) VALUES (
            'authentication_failure',
            CASE WHEN NEW.action = 'login_failed' THEN 'medium' ELSE 'low' END,
            NEW.user_id,
            NEW.ip_address,
            NEW.user_agent,
            NEW.details
        );
    END IF;
    
    -- Create security event for high-risk actions
    IF NEW.risk_level IN ('high', 'critical') THEN
        INSERT INTO security_events (
            event_type, severity, user_id, ip_address, user_agent, event_details
        ) VALUES (
            'high_risk_action',
            NEW.risk_level,
            NEW.user_id,
            NEW.ip_address,
            NEW.user_agent,
            jsonb_build_object(
                'action', NEW.action,
                'resource', NEW.resource,
                'resource_id', NEW.resource_id,
                'details', NEW.details
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for security events
CREATE TRIGGER audit_logs_security_trigger
    AFTER INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION create_security_event_trigger();

-- Function to generate security report
CREATE OR REPLACE FUNCTION generate_security_report(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    metric VARCHAR(100),
    value BIGINT,
    percentage DECIMAL(5,2)
) AS $$
DECLARE
    total_events BIGINT;
BEGIN
    -- Get total events for percentage calculation
    SELECT COUNT(*) INTO total_events
    FROM audit_logs
    WHERE timestamp::DATE BETWEEN p_start_date AND p_end_date;
    
    RETURN QUERY
    SELECT 
        'total_events'::VARCHAR(100) as metric,
        total_events as value,
        100.00 as percentage
    UNION ALL
    SELECT 
        'failed_authentications'::VARCHAR(100),
        COUNT(*),
        ROUND((COUNT(*) * 100.0 / NULLIF(total_events, 0)), 2)
    FROM audit_logs
    WHERE timestamp::DATE BETWEEN p_start_date AND p_end_date
    AND action = 'login_failed'
    UNION ALL
    SELECT 
        'high_risk_events'::VARCHAR(100),
        COUNT(*),
        ROUND((COUNT(*) * 100.0 / NULLIF(total_events, 0)), 2)
    FROM audit_logs
    WHERE timestamp::DATE BETWEEN p_start_date AND p_end_date
    AND risk_level IN ('high', 'critical')
    UNION ALL
    SELECT 
        'unique_users'::VARCHAR(100),
        COUNT(DISTINCT user_id),
        ROUND((COUNT(DISTINCT user_id) * 100.0 / NULLIF(total_events, 0)), 2)
    FROM audit_logs
    WHERE timestamp::DATE BETWEEN p_start_date AND p_end_date
    AND user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on security tables
CREATE TRIGGER update_data_retention_policies_updated_at 
    BEFORE UPDATE ON data_retention_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_config_updated_at 
    BEFORE UPDATE ON security_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_whitelist_updated_at 
    BEFORE UPDATE ON ip_whitelist 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for security compliance and monitoring';
COMMENT ON TABLE security_events IS 'Real-time security event monitoring and alerting';
COMMENT ON TABLE data_retention_policies IS 'HIPAA-compliant data retention policies configuration';
COMMENT ON TABLE security_config IS 'Security configuration parameters';
COMMENT ON TABLE failed_login_attempts IS 'Failed login attempts tracking for security monitoring';
COMMENT ON TABLE ip_whitelist IS 'IP address whitelist for enhanced security';

COMMENT ON VIEW security_events IS 'View of high-risk and failed security events for monitoring';
COMMENT ON VIEW user_activity_summary IS 'Summary of user activity patterns for analytics';

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('002', 'Audit and security system with HIPAA compliance');

-- Log completion
SELECT 'Consolidated migration 002 (audit and security) completed successfully' AS status;