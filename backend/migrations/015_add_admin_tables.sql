-- Migration: 015_add_admin_tables.sql
-- Description: Add admin panel tables for Phase 6 implementation
-- Date: 2025-07-07

-- Create admin action types enum
CREATE TYPE admin_action_type AS ENUM (
  'user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_reactivated',
  'subscription_created', 'subscription_updated', 'subscription_cancelled',
  'system_setting_updated', 'professional_validated', 'professional_rejected',
  'content_moderated', 'report_resolved', 'backup_created', 'maintenance_started'
);

-- Admin actions table - audit trail for administrative actions
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type admin_action_type NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50), -- 'user', 'subscription', 'system', etc.
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table - configurable system parameters
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE, -- Can be read by non-admin users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table - user subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'suspended'
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE,
    payment_method VARCHAR(50),
    stripe_subscription_id VARCHAR(255),
    last_payment_date DATE,
    next_payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, status) -- One active subscription per user
);

-- Payments table - payment history and transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50), -- 'stripe', 'paypal', etc.
    provider_transaction_id VARCHAR(255),
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    platform_fee_percentage DECIMAL(5, 2) DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support tickets table - customer support system
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'technical', 'billing', 'account', 'general'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Support ticket messages table - conversation history
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal admin notes
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System notifications table - admin notifications and alerts
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'success'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target_audience VARCHAR(20) DEFAULT 'admin', -- 'admin', 'all', 'role:professional'
    is_read BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add status column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin_id ON support_tickets(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_target_audience ON system_notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Create triggers for automatic updated_at timestamp
CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at 
    BEFORE UPDATE ON support_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value, description, type, category, is_public) VALUES
('site_name', 'Mundoctor', 'Nombre del sitio web', 'string', 'general', true),
('site_description', 'Plataforma de citas médicas online', 'Descripción del sitio', 'string', 'general', true),
('maintenance_mode', 'false', 'Modo de mantenimiento activado', 'boolean', 'system', false),
('user_registration_enabled', 'true', 'Permitir registro de nuevos usuarios', 'boolean', 'users', false),
('email_verification_required', 'true', 'Requerir verificación de email', 'boolean', 'users', false),
('max_appointments_per_day', '10', 'Máximo de citas por día por profesional', 'number', 'appointments', false),
('platform_fee_percentage', '10.0', 'Porcentaje de comisión de la plataforma', 'number', 'payments', false),
('currency', 'USD', 'Moneda principal del sistema', 'string', 'payments', true),
('support_email', 'support@mundoctor.com', 'Email de soporte al cliente', 'string', 'support', true),
('backup_frequency', 'daily', 'Frecuencia de respaldos automáticos', 'string', 'system', false)
ON CONFLICT (key) DO NOTHING;

-- Function to automatically update subscription status based on dates
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as expired if end_date has passed
    IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status = 'expired';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update subscription status
CREATE TRIGGER auto_update_subscription_status
    BEFORE INSERT OR UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_subscription_status();

-- Function to log admin actions automatically
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert admin action when certain tables are modified
    IF TG_TABLE_NAME = 'users' AND (OLD.status != NEW.status OR OLD.role != NEW.role) THEN
        INSERT INTO admin_actions (admin_id, action_type, target_user_id, details)
        VALUES (
            NULL, -- Will be set by application
            CASE 
                WHEN OLD.status != NEW.status THEN 
                    CASE NEW.status 
                        WHEN 'suspended' THEN 'user_suspended'::admin_action_type
                        WHEN 'active' THEN 'user_reactivated'::admin_action_type
                        ELSE 'user_updated'::admin_action_type
                    END
                ELSE 'user_updated'::admin_action_type
            END,
            NEW.id,
            json_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_role', OLD.role,
                'new_role', NEW.role
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic admin action logging on user changes
CREATE TRIGGER auto_log_user_changes
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Create a view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'patient' AND status = 'active') as active_patients,
    (SELECT COUNT(*) FROM users WHERE role = 'professional' AND status = 'active') as active_professionals,
    (SELECT COUNT(*) FROM appointments WHERE created_at >= CURRENT_DATE) as today_appointments,
    (SELECT COUNT(*) FROM appointments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_completed_appointments,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
    (SELECT COUNT(*) FROM reviews WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_reviews,
    (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions;