-- =========================================
-- SINGLE TRAINER FITNESS PLATFORM DATABASE
-- Optimized for One Trainer with Multiple Clients
-- Includes Full Payment Processing
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- USER MANAGEMENT (SIMPLIFIED)
-- =========================================

-- Users table (admin/trainer and clients only)
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
    
    -- Subscription & Payment Info
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_plan VARCHAR(50) DEFAULT 'trial', -- trial, basic, premium
    subscription_status VARCHAR(50) DEFAULT 'trialing', -- trialing, active, cancelled, past_due
    subscription_amount DECIMAL(10,2),
    trial_ends_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    last_login TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles
CREATE TABLE user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Personal Info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    avatar_url VARCHAR(500),
    bio TEXT,
    
    -- Physical Stats
    height_cm DECIMAL(5,2),
    starting_weight_kg DECIMAL(5,2),
    current_weight_kg DECIMAL(5,2),
    goal_weight_kg DECIMAL(5,2),
    activity_level VARCHAR(50),
    fitness_experience VARCHAR(50),
    
    -- Contact & Emergency
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    -- Health Info
    medical_conditions TEXT[],
    injuries TEXT[],
    allergies TEXT[],
    medications TEXT[],
    
    -- Preferences
    preferred_workout_time VARCHAR(50),
    preferred_workout_days TEXT[],
    equipment_available TEXT[],
    
    -- Settings
    notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- GOALS & PROGRESS
-- =========================================

-- Client goals
CREATE TABLE goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- weight_loss, muscle_gain, endurance, strength, health
    
    -- Measurable targets
    target_value DECIMAL(10,2),
    target_unit VARCHAR(50),
    starting_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    
    target_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, achieved, paused, cancelled
    priority INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    achieved_at TIMESTAMP
);

-- Progress entries with detailed tracking
CREATE TABLE progress_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    
    -- Body Composition
    weight_kg DECIMAL(5,2),
    body_fat_percentage DECIMAL(4,2),
    muscle_mass_kg DECIMAL(5,2),
    water_percentage DECIMAL(4,2),
    bone_mass_kg DECIMAL(4,2),
    
    -- Measurements (in cm)
    chest DECIMAL(5,2),
    waist DECIMAL(5,2),
    hips DECIMAL(5,2),
    thighs DECIMAL(5,2),
    arms DECIMAL(5,2),
    neck DECIMAL(5,2),
    
    -- Performance Metrics
    resting_heart_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    
    -- Subjective Metrics
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    soreness_level INTEGER CHECK (soreness_level >= 1 AND soreness_level <= 10),
    
    -- Photos
    front_photo_url VARCHAR(500),
    side_photo_url VARCHAR(500),
    back_photo_url VARCHAR(500),
    
    -- Notes
    client_notes TEXT,
    trainer_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, entry_date)
);

-- =========================================
-- WORKOUT SYSTEM
-- =========================================

-- Exercise library
CREATE TABLE exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    muscle_groups TEXT[],
    equipment_needed TEXT[],
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    
    -- Instructions
    setup_instructions TEXT,
    execution_instructions TEXT,
    tips TEXT,
    common_mistakes TEXT,
    
    -- Media
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Metadata
    is_compound BOOLEAN DEFAULT false,
    calories_per_minute DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout programs (multi-week programs)
CREATE TABLE workout_programs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_weeks INTEGER,
    difficulty_level INTEGER,
    goal VARCHAR(100),
    equipment_needed TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual workouts
CREATE TABLE workouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES workout_programs(id),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    duration_minutes INTEGER,
    
    -- Completion
    completed_at TIMESTAMP,
    actual_duration_minutes INTEGER,
    calories_burned INTEGER,
    
    -- Feedback
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    client_notes TEXT,
    trainer_notes TEXT,
    
    -- AI Generated
    is_ai_generated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises within workouts
CREATE TABLE workout_exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id),
    
    -- Planned
    order_number INTEGER NOT NULL,
    sets INTEGER,
    target_reps VARCHAR(50), -- Can be range "8-12" or time "30s"
    target_weight_kg DECIMAL(5,2),
    rest_seconds INTEGER,
    tempo VARCHAR(20), -- e.g., "2-0-2-0"
    
    -- Actual Performance
    completed_sets INTEGER,
    actual_reps INTEGER[], -- Array of reps per set
    actual_weight_kg DECIMAL(5,2)[], -- Array of weights per set
    
    -- Form & Notes
    form_rating INTEGER CHECK (form_rating >= 1 AND form_rating <= 5),
    notes TEXT
);

-- =========================================
-- NUTRITION
-- =========================================

-- Meal plans
CREATE TABLE meal_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    
    -- Targets
    daily_calories INTEGER,
    protein_g INTEGER,
    carbs_g INTEGER,
    fat_g INTEGER,
    fiber_g INTEGER,
    
    -- Schedule
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily nutrition logs
CREATE TABLE nutrition_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    
    -- Meal tracking
    meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack
    food_description TEXT,
    
    -- Macros
    calories INTEGER,
    protein_g DECIMAL(6,2),
    carbs_g DECIMAL(6,2),
    fat_g DECIMAL(6,2),
    fiber_g DECIMAL(6,2),
    
    -- Hydration
    water_ml INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- PAYMENTS & SUBSCRIPTIONS
-- =========================================

-- Subscription plans configuration
CREATE TABLE subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    stripe_price_id VARCHAR(255) UNIQUE,
    
    -- Pricing
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Features
    features JSONB,
    description TEXT,
    
    -- Limits
    workout_limit INTEGER, -- NULL for unlimited
    nutrition_tracking BOOLEAN DEFAULT true,
    progress_tracking BOOLEAN DEFAULT true,
    ai_coach_access BOOLEAN DEFAULT false,
    video_calls_included INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment records
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Stripe Info
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_invoice_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    
    -- Status
    status VARCHAR(50) NOT NULL, -- pending, processing, succeeded, failed, refunded
    payment_method VARCHAR(50), -- card, bank_transfer, etc
    
    -- Metadata
    invoice_url VARCHAR(500),
    receipt_url VARCHAR(500),
    refund_amount DECIMAL(10,2),
    refunded_at TIMESTAMP,
    failure_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

-- Invoices
CREATE TABLE invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    
    invoice_number VARCHAR(50),
    amount_due DECIMAL(10,2),
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    status VARCHAR(50), -- draft, open, paid, void
    due_date DATE,
    paid_at TIMESTAMP,
    
    invoice_pdf_url VARCHAR(500),
    hosted_invoice_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- COMMUNICATION
-- =========================================

-- Messages between trainer and clients
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    conversation_id UUID NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, video, audio, file
    content TEXT,
    
    -- Attachments
    attachment_url VARCHAR(500),
    attachment_type VARCHAR(50),
    attachment_size INTEGER,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    
    -- AI Related
    is_ai_generated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Coaching conversations
CREATE TABLE ai_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    
    -- Usage tracking
    tokens_used INTEGER,
    model_used VARCHAR(50),
    cost DECIMAL(10,6),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- SCHEDULING
-- =========================================

-- Calendar events (sessions, check-ins, etc)
CREATE TABLE calendar_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50), -- session, check_in, consultation, measurement
    title VARCHAR(255),
    description TEXT,
    
    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    -- Location
    location VARCHAR(255),
    is_virtual BOOLEAN DEFAULT false,
    meeting_link VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
    
    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- ACHIEVEMENTS & GAMIFICATION
-- =========================================

-- Achievements/Badges
CREATE TABLE achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    points INTEGER DEFAULT 0,
    category VARCHAR(50), -- workout, nutrition, consistency, milestone
    
    -- Criteria (stored as JSON for flexibility)
    criteria JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client achievements
CREATE TABLE client_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id),
    
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, achievement_id)
);

-- Streaks
CREATE TABLE streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    streak_type VARCHAR(50), -- workout, nutrition_logging, check_in
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, streak_type)
);

-- =========================================
-- ANALYTICS & REPORTING
-- =========================================

-- User activity tracking
CREATE TABLE activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    action VARCHAR(100) NOT NULL, -- login, workout_completed, payment_made, etc
    details JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI usage tracking for cost management
CREATE TABLE ai_usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    function_name VARCHAR(100),
    model VARCHAR(50),
    
    -- Token usage
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Cost tracking
    estimated_cost DECIMAL(10,6),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin dashboard metrics (cached)
CREATE TABLE dashboard_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_date DATE NOT NULL UNIQUE,
    
    -- Financial
    total_revenue DECIMAL(10,2),
    monthly_recurring_revenue DECIMAL(10,2),
    average_revenue_per_user DECIMAL(10,2),
    
    -- Clients
    total_clients INTEGER,
    active_clients INTEGER,
    trial_clients INTEGER,
    churned_clients INTEGER,
    
    -- Engagement
    workouts_completed INTEGER,
    average_completion_rate DECIMAL(5,2),
    messages_sent INTEGER,
    
    -- Calculated metrics
    churn_rate DECIMAL(5,2),
    growth_rate DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

CREATE INDEX idx_progress_client_date ON progress_entries(client_id, entry_date DESC);

CREATE INDEX idx_workouts_client_date ON workouts(client_id, scheduled_date DESC);
CREATE INDEX idx_workouts_completed ON workouts(completed_at);

CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read);

CREATE INDEX idx_calendar_client_time ON calendar_events(client_id, start_time);

CREATE INDEX idx_activity_user_created ON activity_logs(user_id, created_at DESC);

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate client statistics
CREATE OR REPLACE FUNCTION get_client_stats(p_client_id UUID)
RETURNS TABLE (
    total_workouts INTEGER,
    completed_workouts INTEGER,
    completion_rate DECIMAL,
    current_streak INTEGER,
    weight_change DECIMAL,
    days_active INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_workouts,
        COUNT(completed_at)::INTEGER as completed_workouts,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(completed_at)::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0 
        END as completion_rate,
        COALESCE((
            SELECT current_streak 
            FROM streaks 
            WHERE client_id = p_client_id 
            AND streak_type = 'workout'
        ), 0)::INTEGER as current_streak,
        (
            SELECT current_weight_kg - starting_weight_kg
            FROM user_profiles
            WHERE user_id = p_client_id
        ) as weight_change,
        (
            SELECT COUNT(DISTINCT DATE(created_at))::INTEGER
            FROM activity_logs
            WHERE user_id = p_client_id
        ) as days_active
    FROM workouts
    WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- INITIAL DATA
-- =========================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, workout_limit, ai_coach_access) VALUES
('Free Trial', 0, 0, '{"duration": "14 days", "features": ["Basic workouts", "Progress tracking"]}', 10, false),
('Basic', 49, 490, '{"features": ["Unlimited workouts", "Nutrition tracking", "Progress analytics"]}', NULL, false),
('Premium', 79, 790, '{"features": ["Everything in Basic", "AI Coach", "Priority support", "Video calls"]}', NULL, true),
('Elite', 149, 1490, '{"features": ["Everything in Premium", "Daily check-ins", "Custom meal plans", "Unlimited video calls"]}', NULL, true);

-- Insert sample exercises
INSERT INTO exercises (name, category, muscle_groups, equipment_needed, difficulty_level) VALUES
('Barbell Bench Press', 'Chest', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], 3),
('Squat', 'Legs', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['barbell', 'squat rack'], 3),
('Deadlift', 'Back', ARRAY['back', 'glutes', 'hamstrings'], ARRAY['barbell'], 4),
('Pull-up', 'Back', ARRAY['back', 'biceps'], ARRAY['pull-up bar'], 3),
('Shoulder Press', 'Shoulders', ARRAY['shoulders', 'triceps'], ARRAY['dumbbells'], 2);

-- Insert sample achievements
INSERT INTO achievements (name, description, category, points, criteria) VALUES
('First Workout', 'Complete your first workout', 'milestone', 10, '{"workouts_completed": 1}'),
('Week Warrior', 'Complete 5 workouts in a week', 'consistency', 50, '{"workouts_per_week": 5}'),
('Weight Loss Pro', 'Lose 5kg', 'milestone', 100, '{"weight_loss": 5}'),
('30 Day Streak', 'Work out for 30 days straight', 'consistency', 200, '{"streak_days": 30}');

-- =========================================
-- SECURITY NOTES
-- =========================================

/*
IMPORTANT SECURITY CONSIDERATIONS:

1. Enable Row Level Security (RLS):
   - Clients can only see their own data
   - Admin can see all data
   
2. API Key Management:
   - Store Stripe keys securely
   - Use environment variables
   - Never expose keys in frontend
   
3. Payment Security:
   - Use Stripe's secure checkout
   - Never store card details
   - Implement webhook signature verification
   
4. Data Protection:
   - Encrypt sensitive health data
   - Regular backups
   - GDPR compliance for EU users
*/