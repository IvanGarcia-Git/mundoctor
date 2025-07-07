-- Migration: 004_add_professional_validations.sql
-- Description: Add professional_validations table and missing components
-- Date: 2025-07-03

-- Create professional_validations table for document validation
CREATE TABLE professional_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    college_number VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    dni_document_url TEXT,
    degree_document_url TEXT,
    certification_document_url TEXT,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
    validation_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professional_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS professional_subscriptions (
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

-- Create indexes for performance
CREATE INDEX idx_professional_validations_user_id ON professional_validations(user_id);
CREATE INDEX idx_professional_validations_status ON professional_validations(validation_status);

-- Create unique constraint for user validations
CREATE UNIQUE INDEX idx_professional_validations_user ON professional_validations(user_id);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_professional_validations_updated_at 
    BEFORE UPDATE ON professional_validations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans if table is empty
INSERT INTO professional_subscriptions (name, description, price, features, max_appointments, max_patients, analytics_enabled, priority_support) 
SELECT * FROM (VALUES
    ('free', 'Plan Gratuito', 0.00, '["Perfil básico", "Hasta 10 citas/mes"]'::jsonb, 10, 50, false, false),
    ('basic', 'Plan Básico', 29.99, '["Perfil completo", "Hasta 50 citas/mes", "Recordatorios automáticos"]'::jsonb, 50, 200, false, false),
    ('premium', 'Plan Premium', 59.99, '["Perfil premium", "Citas ilimitadas", "Analytics básicos", "Soporte prioritario"]'::jsonb, -1, -1, true, true),
    ('enterprise', 'Plan Empresarial', 99.99, '["Todas las funciones", "Analytics avanzados", "API access", "Soporte 24/7"]'::jsonb, -1, -1, true, true)
) AS v(name, description, price, features, max_appointments, max_patients, analytics_enabled, priority_support)
WHERE NOT EXISTS (SELECT 1 FROM professional_subscriptions);