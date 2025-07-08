-- Migration 016: Add payment system tables
-- Phase 9: Payment integration with Stripe

-- Start transaction
BEGIN;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  interval VARCHAR(50) NOT NULL, -- monthly, quarterly, yearly
  interval_count INTEGER DEFAULT 1,
  trial_period_days INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  stripe_price_id VARCHAR(255),
  clerk_plan_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255),
  appointment_id VARCHAR(255),
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50) NOT NULL,
  payment_type VARCHAR(50) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  clerk_payment_id VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,
  refunded_at TIMESTAMP,
  refund_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(255) REFERENCES subscription_plans(id),
  plan_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  interval VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  clerk_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255) REFERENCES subscriptions(id),
  payment_id VARCHAR(255) REFERENCES payments(id),
  invoice_number VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  subtotal INTEGER NOT NULL DEFAULT 0, -- Amount in cents
  tax INTEGER NOT NULL DEFAULT 0, -- Amount in cents
  total INTEGER NOT NULL DEFAULT 0, -- Amount in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  sent_at TIMESTAMP,
  pdf_url TEXT,
  stripe_invoice_id VARCHAR(255),
  clerk_invoice_id VARCHAR(255),
  customer_info JSONB NOT NULL DEFAULT '{}',
  company_info JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- Amount in cents
  amount INTEGER NOT NULL, -- Total amount in cents
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id VARCHAR(255) REFERENCES payments(id),
  type VARCHAR(50) NOT NULL, -- payment, refund, adjustment
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  status VARCHAR(50) NOT NULL,
  description TEXT,
  reference VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  source VARCHAR(50) NOT NULL, -- stripe, clerk
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for subscription_id in payments table
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_subscription 
FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Add stripe_customer_id to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, amount, currency, interval, features, stripe_price_id) VALUES
('plan_basic', 'Plan Básico', 'Plan básico para profesionales de la salud', 29900, 'MXN', 'monthly', 
 '["Hasta 50 citas por mes", "Perfil profesional", "Calendario básico", "Soporte por email"]', NULL),

('plan_professional', 'Plan Profesional', 'Plan profesional con funciones avanzadas', 49900, 'MXN', 'monthly',
 '["Citas ilimitadas", "Análisis de métricas", "Calendario avanzado", "Soporte prioritario", "Integración con terceros"]', NULL),

('plan_premium', 'Plan Premium', 'Plan premium con todas las funciones', 79900, 'MXN', 'monthly',
 '["Todo del Plan Profesional", "Herramientas de marketing", "API personalizada", "Soporte 24/7", "Consultor dedicado"]', NULL),

('plan_basic_yearly', 'Plan Básico Anual', 'Plan básico anual con descuento', 299000, 'MXN', 'yearly',
 '["Hasta 50 citas por mes", "Perfil profesional", "Calendario básico", "Soporte por email", "2 meses gratis"]', NULL),

('plan_professional_yearly', 'Plan Profesional Anual', 'Plan profesional anual con descuento', 499000, 'MXN', 'yearly',
 '["Citas ilimitadas", "Análisis de métricas", "Calendario avanzado", "Soporte prioritario", "Integración con terceros", "2 meses gratis"]', NULL),

('plan_premium_yearly', 'Plan Premium Anual', 'Plan premium anual con descuento', 799000, 'MXN', 'yearly',
 '["Todo del Plan Profesional", "Herramientas de marketing", "API personalizada", "Soporte 24/7", "Consultor dedicado", "2 meses gratis"]', NULL)

ON CONFLICT (id) DO NOTHING;

-- Commit transaction
COMMIT;

-- Log completion
SELECT 'Migration 016: Payment tables created successfully' AS status;