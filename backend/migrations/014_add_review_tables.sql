-- Migration: 014_add_review_tables.sql
-- Description: Add review system tables for Phase 5 implementation
-- Date: 2025-07-07

-- Create review status enum
CREATE TYPE review_status AS ENUM ('active', 'flagged', 'deleted', 'hidden');
CREATE TYPE moderation_status AS ENUM ('approved', 'pending', 'rejected', 'flagged');

-- Reviews table - main reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    status review_status DEFAULT 'active',
    moderation_status moderation_status DEFAULT 'approved',
    helpful_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(patient_id, professional_id, appointment_id)
);

-- Review reports table - for reporting inappropriate reviews
CREATE TABLE IF NOT EXISTS review_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    UNIQUE(review_id, reporter_id)
);

-- Review helpful votes table - for marking reviews as helpful
CREATE TABLE IF NOT EXISTS review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- Professional rating summaries table - cached statistics
CREATE TABLE IF NOT EXISTS professional_rating_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_1_count INTEGER DEFAULT 0,
    rating_2_count INTEGER DEFAULT 0,
    rating_3_count INTEGER DEFAULT 0,
    rating_4_count INTEGER DEFAULT 0,
    rating_5_count INTEGER DEFAULT 0,
    reviews_with_comments INTEGER DEFAULT 0,
    recent_average_rating DECIMAL(3,2) DEFAULT 0, -- Last 30 days
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(professional_id)
);

-- Update professional_profiles table to include rating columns if they don't exist
ALTER TABLE professional_profiles 
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_patient_id ON reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_reviews_professional_id ON reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment_id ON reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_reporter_id ON review_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_rating_summaries_professional_id ON professional_rating_summaries(professional_id);

-- Create triggers for automatic updated_at timestamp
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update professional rating summary
CREATE OR REPLACE FUNCTION update_professional_rating_summary(prof_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert or update the rating summary
    INSERT INTO professional_rating_summaries (
        professional_id,
        total_reviews,
        average_rating,
        rating_1_count,
        rating_2_count,
        rating_3_count,
        rating_4_count,
        rating_5_count,
        reviews_with_comments,
        recent_average_rating,
        last_updated
    )
    SELECT 
        prof_id,
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4_count,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5_count,
        COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as reviews_with_comments,
        COALESCE(AVG(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN rating END), 0) as recent_average_rating,
        NOW()
    FROM reviews 
    WHERE professional_id = prof_id 
      AND status = 'active' 
      AND moderation_status = 'approved'
    ON CONFLICT (professional_id) 
    DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        average_rating = EXCLUDED.average_rating,
        rating_1_count = EXCLUDED.rating_1_count,
        rating_2_count = EXCLUDED.rating_2_count,
        rating_3_count = EXCLUDED.rating_3_count,
        rating_4_count = EXCLUDED.rating_4_count,
        rating_5_count = EXCLUDED.rating_5_count,
        reviews_with_comments = EXCLUDED.reviews_with_comments,
        recent_average_rating = EXCLUDED.recent_average_rating,
        last_updated = EXCLUDED.last_updated;
    
    -- Also update the professional_profiles table
    UPDATE professional_profiles 
    SET 
        total_reviews = (SELECT total_reviews FROM professional_rating_summaries WHERE professional_id = prof_id),
        average_rating = (SELECT average_rating FROM professional_rating_summaries WHERE professional_id = prof_id),
        updated_at = NOW()
    WHERE user_id = prof_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE reviews 
    SET helpful_count = (
        SELECT COUNT(*) 
        FROM review_helpful_votes 
        WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
          AND is_helpful = true
    )
    WHERE id = COALESCE(NEW.review_id, OLD.review_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update helpful count when votes change
CREATE TRIGGER update_helpful_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
    FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- Function to automatically update professional rating summary when review changes
CREATE OR REPLACE FUNCTION trigger_update_professional_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update for the professional in the new/updated review
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_professional_rating_summary(NEW.professional_id);
    END IF;
    
    -- Update for the professional in the deleted review
    IF TG_OP = 'DELETE' THEN
        PERFORM update_professional_rating_summary(OLD.professional_id);
    END IF;
    
    -- If professional_id changed in an update, update both
    IF TG_OP = 'UPDATE' AND OLD.professional_id != NEW.professional_id THEN
        PERFORM update_professional_rating_summary(OLD.professional_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update rating summary when reviews change
CREATE TRIGGER auto_update_professional_rating_summary
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_update_professional_rating_summary();

-- Initial population of professional rating summaries for existing professionals
INSERT INTO professional_rating_summaries (professional_id)
SELECT DISTINCT u.id
FROM users u
JOIN professional_profiles pp ON u.id = pp.user_id
WHERE u.role = 'professional'
ON CONFLICT (professional_id) DO NOTHING;

-- Sample review moderation keywords for content filtering
CREATE TABLE IF NOT EXISTS review_moderation_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    action VARCHAR(20) DEFAULT 'flag', -- flag, block, warn
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(keyword)
);

-- Insert basic moderation keywords
INSERT INTO review_moderation_keywords (keyword, severity, action) VALUES
('idiota', 'high', 'block'),
('estúpido', 'high', 'block'),
('imbécil', 'high', 'block'),
('tonto', 'medium', 'flag'),
('pendejo', 'high', 'block'),
('cabrón', 'high', 'block'),
('mierda', 'high', 'block'),
('puto', 'high', 'block'),
('puta', 'high', 'block'),
('joder', 'medium', 'flag'),
('coño', 'medium', 'flag'),
('hijo de puta', 'high', 'block'),
('malo', 'low', 'warn'),
('terrible', 'low', 'warn'),
('pésimo', 'medium', 'flag')
ON CONFLICT (keyword) DO NOTHING;