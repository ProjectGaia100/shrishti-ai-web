-- ============================================================================
-- GEO VISION - Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================================

-- Ensure UUID helper exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PROFILES TABLE
-- Mobile app profile data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 1a. USER PROFILES TABLE
-- Extends Supabase auth.users with additional profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  purpose TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER on_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 1b. SAVED LOCATIONS TABLE
-- Stores user's saved weather locations
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lon DECIMAL(10, 6) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, lat, lon)
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON public.saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_is_default ON public.saved_locations(user_id, is_default);

-- Auto-update timestamps
DROP TRIGGER IF EXISTS on_saved_locations_updated ON public.saved_locations;
CREATE TRIGGER on_saved_locations_updated
  BEFORE UPDATE ON public.saved_locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 2. ACTIVITY LOGS TABLE
-- Tracks user actions within the dashboard
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login', 'logout', 'signup',
    'prediction_run', 'weather_forecast',
    'chatbot_query', 'profile_update',
    'settings_change', 'dataset_view'
  )),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(activity_type);


-- 3. DISASTER ALERTS TABLE
-- Stores disaster prediction alerts sent to mobile users for their saved locations
CREATE TABLE IF NOT EXISTS public.disaster_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.saved_locations(id) ON DELETE CASCADE NOT NULL,
  disaster_type TEXT NOT NULL CHECK (disaster_type IN ('FLOOD', 'DROUGHT', 'STORM', 'LANDSLIDE')),
  risk_score DECIMAL(5, 3) NOT NULL,
  confidence DECIMAL(5, 3) NOT NULL,
  prediction_timestamp TIMESTAMPTZ NOT NULL,
  alert_sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  alert_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_disaster_alerts_user_id ON public.disaster_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_disaster_alerts_location_id ON public.disaster_alerts(location_id);
CREATE INDEX IF NOT EXISTS idx_disaster_alerts_created_at ON public.disaster_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disaster_alerts_alert_read ON public.disaster_alerts(user_id, alert_read);


-- 4. PREDICTION RUNS TABLE
-- Tracks scheduled disaster prediction batch runs 
CREATE TABLE IF NOT EXISTS public.prediction_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  total_locations INTEGER NOT NULL,
  predictions_made INTEGER NOT NULL,
  alerts_created INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  duration_seconds DECIMAL(10, 2),
  status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prediction_runs_run_timestamp ON public.prediction_runs(run_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_runs_status ON public.prediction_runs(status);


-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_runs ENABLE ROW LEVEL SECURITY;

-- PROFILES policies (Mobile app)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- USER PROFILES policies
DROP POLICY IF EXISTS "Web users can view their own profile" ON public.user_profiles;
CREATE POLICY "Web users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Web users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Web users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Web users can update their own profile" ON public.user_profiles;
CREATE POLICY "Web users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SAVED LOCATIONS policies
DROP POLICY IF EXISTS "Users can view their own saved locations" ON public.saved_locations;
CREATE POLICY "Users can view their own saved locations"
  ON public.saved_locations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved locations" ON public.saved_locations;
CREATE POLICY "Users can insert their own saved locations"
  ON public.saved_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved locations" ON public.saved_locations;
CREATE POLICY "Users can update their own saved locations"
  ON public.saved_locations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved locations" ON public.saved_locations;
CREATE POLICY "Users can delete their own saved locations"
  ON public.saved_locations FOR DELETE
  USING (auth.uid() = user_id);

-- ACTIVITY LOGS policies
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DISASTER ALERTS policies
DROP POLICY IF EXISTS "Users can view their own disaster alerts" ON public.disaster_alerts;
CREATE POLICY "Users can view their own disaster alerts"
  ON public.disaster_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Backend can insert disaster alerts for users" ON public.disaster_alerts;
CREATE POLICY "Backend can insert disaster alerts for users"
  ON public.disaster_alerts FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can update their own disaster alerts" ON public.disaster_alerts;
CREATE POLICY "Users can update their own disaster alerts"
  ON public.disaster_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own disaster alerts" ON public.disaster_alerts;
CREATE POLICY "Users can delete their own disaster alerts"
  ON public.disaster_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- PREDICTION RUNS policies (read-only for anyone)
DROP POLICY IF EXISTS "Anyone can view prediction runs" ON public.prediction_runs;
CREATE POLICY "Anyone can view prediction runs"
  ON public.prediction_runs FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Backend can insert prediction runs" ON public.prediction_runs;
CREATE POLICY "Backend can insert prediction runs"
  ON public.prediction_runs FOR INSERT
  WITH CHECK (TRUE);


-- ============================================================================
-- 5. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================================================
-- This creates profile rows when a user signs up via Supabase Auth,
-- so even if the client-side insert fails, profile rows exist.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create mobile profile entry
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email);

  -- Create web profile entry
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.user_profiles.full_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
