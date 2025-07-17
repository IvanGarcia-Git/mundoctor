-- Migración para optimización de índices de base de datos
-- Versión: 002
-- Fecha: 2024-01-01
-- Descripción: Añadir índices optimizados para mejorar performance de queries

-- =============================================
-- ÍNDICES PARA TABLA USERS
-- =============================================

-- Índice único para clerk_id (usado frecuentemente en autenticación)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Índice para email (búsquedas y validaciones)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índice para role (filtros por tipo de usuario)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Índice compuesto para consultas de usuarios activos por rol
CREATE INDEX IF NOT EXISTS idx_users_role_verified ON users(role, verified) WHERE verified = true;

-- Índice para created_at (ordenación y filtros de fecha)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- =============================================
-- ÍNDICES PARA TABLA PROFESSIONALS
-- =============================================

-- Índice para user_id (JOIN frecuente con users)
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);

-- Índice para specialty_id (filtros por especialidad)
CREATE INDEX IF NOT EXISTS idx_professionals_specialty_id ON professionals(specialty_id);

-- Índice para city (búsquedas geográficas)
CREATE INDEX IF NOT EXISTS idx_professionals_city ON professionals(city);

-- Índice compuesto para búsquedas geográficas (latitud, longitud)
CREATE INDEX IF NOT EXISTS idx_professionals_location ON professionals(latitude, longitude);

-- Índice para rating (ordenación por valoración)
CREATE INDEX IF NOT EXISTS idx_professionals_rating ON professionals(rating DESC);

-- Índice para verification status
CREATE INDEX IF NOT EXISTS idx_professionals_verified ON professionals(verified);

-- Índice compuesto para búsquedas optimizadas (city + specialty + verified)
CREATE INDEX IF NOT EXISTS idx_professionals_search_main 
ON professionals(city, specialty_id, verified, rating DESC) 
WHERE verified = true;

-- Índice para consultation_fee (filtros de precio)
CREATE INDEX IF NOT EXISTS idx_professionals_consultation_fee ON professionals(consultation_fee);

-- Índice compuesto para búsquedas con precio y rating
CREATE INDEX IF NOT EXISTS idx_professionals_price_rating 
ON professionals(consultation_fee, rating DESC) 
WHERE verified = true;

-- Índice para created_at (nuevos profesionales)
CREATE INDEX IF NOT EXISTS idx_professionals_created_at ON professionals(created_at);

-- =============================================
-- ÍNDICES PARA TABLA SPECIALTIES
-- =============================================

-- Índice para name (búsquedas de especialidades)
CREATE INDEX IF NOT EXISTS idx_specialties_name ON specialties(name);

-- Índice para is_active (solo especialidades activas)
CREATE INDEX IF NOT EXISTS idx_specialties_active ON specialties(is_active) WHERE is_active = true;

-- =============================================
-- ÍNDICES PARA TABLA APPOINTMENTS
-- =============================================

-- Índice para professional_id (citas por profesional)
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);

-- Índice para patient_id (citas por paciente)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);

-- Índice para appointment_date (ordenación por fecha)
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Índice para status (filtros por estado)
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Índice compuesto para dashboard de profesional
CREATE INDEX IF NOT EXISTS idx_appointments_professional_date_status 
ON appointments(professional_id, appointment_date DESC, status);

-- Índice compuesto para dashboard de paciente
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date_status 
ON appointments(patient_id, appointment_date DESC, status);

-- Índice para citas próximas (optimizar consultas de agenda)
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming 
ON appointments(professional_id, appointment_date) 
WHERE status IN ('confirmed', 'pending') AND appointment_date >= CURRENT_DATE;

-- Índice para created_at
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);

-- =============================================
-- ÍNDICES PARA TABLA REVIEWS
-- =============================================

-- Índice para professional_id (reviews por profesional)
CREATE INDEX IF NOT EXISTS idx_reviews_professional_id ON reviews(professional_id);

-- Índice para patient_id (reviews por paciente)
CREATE INDEX IF NOT EXISTS idx_reviews_patient_id ON reviews(patient_id);

-- Índice para rating (ordenación por valoración)
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating DESC);

-- Índice compuesto para estadísticas de profesional
CREATE INDEX IF NOT EXISTS idx_reviews_professional_rating_created 
ON reviews(professional_id, rating, created_at DESC);

-- Índice para created_at (reviews recientes)
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- =============================================
-- ÍNDICES PARA TABLA SERVICES
-- =============================================

-- Índice para professional_id (servicios por profesional)
CREATE INDEX IF NOT EXISTS idx_services_professional_id ON services(professional_id);

-- Índice para is_active (solo servicios activos)
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE is_active = true;

-- Índice para price (filtros de precio)
CREATE INDEX IF NOT EXISTS idx_services_price ON services(price);

-- Índice compuesto para búsqueda de servicios
CREATE INDEX IF NOT EXISTS idx_services_professional_active_price 
ON services(professional_id, is_active, price) 
WHERE is_active = true;

-- =============================================
-- ÍNDICES PARA TABLA PAYMENTS
-- =============================================

-- Índice para appointment_id (pagos por cita)
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);

-- Índice para status (filtros por estado de pago)
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Índice para created_at (pagos recientes)
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Índice compuesto para auditoría de pagos
CREATE INDEX IF NOT EXISTS idx_payments_status_date 
ON payments(status, created_at DESC);

-- =============================================
-- ÍNDICES PARA TABLA NOTIFICATIONS
-- =============================================

-- Índice para user_id (notificaciones por usuario)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Índice para is_read (notificaciones no leídas)
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- Índice para type (filtros por tipo)
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Índice para created_at
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================
-- ÍNDICES PARA TABLA SUPPORT_TICKETS
-- =============================================

-- Índice para user_id (tickets por usuario)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);

-- Índice para status (filtros por estado)
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Índice para priority (ordenación por prioridad)
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Índice compuesto para dashboard de soporte
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority_created 
ON support_tickets(status, priority DESC, created_at DESC);

-- Índice para created_at
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- =============================================
-- ÍNDICES PARA TABLA AUDIT_LOGS
-- =============================================

-- Índice para user_id (logs por usuario)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Índice para action (filtros por acción)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Índice para table_name (logs por tabla)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Índice para created_at (logs recientes)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Índice compuesto para auditoría específica
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action_date 
ON audit_logs(table_name, action, created_at DESC);

-- =============================================
-- ÍNDICES PARA BÚSQUEDAS DE TEXTO COMPLETO
-- =============================================

-- Índice GIN para búsqueda de texto en biografías de profesionales
CREATE INDEX IF NOT EXISTS idx_professionals_about_fts 
ON professionals USING gin(to_tsvector('spanish', about));

-- Índice GIN para búsqueda de texto en educación de profesionales
CREATE INDEX IF NOT EXISTS idx_professionals_education_fts 
ON professionals USING gin(to_tsvector('spanish', education));

-- Índice GIN para búsqueda en nombres de usuarios
CREATE INDEX IF NOT EXISTS idx_users_name_fts 
ON users USING gin(to_tsvector('spanish', name));

-- Índice GIN para búsqueda en nombres de especialidades
CREATE INDEX IF NOT EXISTS idx_specialties_name_fts 
ON specialties USING gin(to_tsvector('spanish', name));

-- =============================================
-- ÍNDICES PARCIALES PARA OPTIMIZACIÓN
-- =============================================

-- Índice solo para profesionales activos y verificados
CREATE INDEX IF NOT EXISTS idx_professionals_active_verified 
ON professionals(specialty_id, city, rating DESC) 
WHERE verified = true AND profile_completed = true;

-- Índice solo para citas futuras
CREATE INDEX IF NOT EXISTS idx_appointments_future 
ON appointments(professional_id, appointment_date, status) 
WHERE appointment_date >= CURRENT_DATE;

-- Índice solo para usuarios activos
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users(role, created_at DESC) 
WHERE verified = true;

-- =============================================
-- ESTADÍSTICAS Y MANTENIMIENTO
-- =============================================

-- Actualizar estadísticas de la base de datos
ANALYZE;

-- Comentarios para documentación
COMMENT ON INDEX idx_professionals_search_main IS 'Índice principal para búsquedas de profesionales por ciudad, especialidad y verificación';
COMMENT ON INDEX idx_appointments_professional_date_status IS 'Índice optimizado para dashboard de profesionales';
COMMENT ON INDEX idx_professionals_location IS 'Índice geográfico para búsquedas por proximidad';
COMMENT ON INDEX idx_professionals_about_fts IS 'Índice de texto completo para búsquedas en biografías';

-- Verificar que los índices se crearon correctamente
DO $$
BEGIN
    RAISE NOTICE 'Migración 002 completada: Índices optimizados creados exitosamente';
    RAISE NOTICE 'Total de índices en la base de datos: %', (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE schemaname = 'public'
    );
END $$;