-- ============================================================================
-- GEO VISION - Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================================

-- Ensure UUID helper exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USER PROFILES TABLE
-- Extends Supabase auth.users with additional profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  purpose TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  credits INTEGER NOT NULL DEFAULT 30 CHECK (credits >= 0),
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


-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- USER PROFILES policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ACTIVITY LOGS policies
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================================================
-- This creates a minimal profile row when a user signs up via Supabase Auth,
-- so even if the client-side insert fails, a profile row exists.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.user_profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.user_profiles.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 5. API KEYS TABLE
-- Stores API keys for programmatic access to the platform
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                          -- User-friendly name for the key
  key_hash TEXT NOT NULL,                      -- SHA-256 hash of the API key (never store plain key)
  key_prefix TEXT NOT NULL,                    -- First 8 chars of key for identification (e.g., "sk_live_ab")
  permissions JSONB DEFAULT '["models", "data_layers", "chatbot"]'::jsonb,  -- Allowed scopes
  last_used_at TIMESTAMPTZ,                    -- Track last usage
  usage_count INTEGER DEFAULT 0,               -- Total API calls made
  credits_consumed INTEGER DEFAULT 0,          -- Total credits used via this key
  is_active BOOLEAN DEFAULT true,              -- Soft delete / disable
  expires_at TIMESTAMPTZ,                      -- Optional expiration
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS on_api_keys_updated ON public.api_keys;
CREATE TRIGGER on_api_keys_updated
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- API KEYS policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
CREATE POLICY "Users can update their own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 6. API USAGE LOGS TABLE
-- Tracks individual API calls for billing and analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,                      -- e.g., "/v1/models/hazardguard"
  method TEXT NOT NULL,                        -- GET, POST, etc.
  credits_charged INTEGER DEFAULT 0,           -- Credits deducted for this call
  status_code INTEGER,                         -- HTTP response code
  response_time_ms INTEGER,                    -- Latency in milliseconds
  ip_address TEXT,
  user_agent TEXT,
  request_metadata JSONB DEFAULT '{}'::jsonb,  -- Additional request info
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON public.api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON public.api_usage_logs(endpoint);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- API USAGE LOGS policies
DROP POLICY IF EXISTS "Users can view their own API usage logs" ON public.api_usage_logs;
CREATE POLICY "Users can view their own API usage logs"
  ON public.api_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert API usage logs" ON public.api_usage_logs;
CREATE POLICY "System can insert API usage logs"
  ON public.api_usage_logs FOR INSERT
  WITH CHECK (true);  -- Backend inserts via service role key


-- ============================================================================
-- CREDITS MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to get user's credit balance
CREATE OR REPLACE FUNCTION get_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits INTO current_credits
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  RETURN current_credits;
END;
$$;

-- Function to deduct credits safely (with insufficient check)
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits with row lock
  SELECT credits INTO current_credits
  FROM user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'User profile not found'::TEXT;
    RETURN;
  END IF;
  
  IF current_credits < p_amount THEN
    RETURN QUERY SELECT FALSE, current_credits, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;
  
  -- Deduct credits
  UPDATE user_profiles
  SET credits = credits - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT TRUE, (current_credits - p_amount), NULL::TEXT;
END;
$$;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE user_profiles
  SET credits = credits + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING credits INTO new_credits;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, new_credits;
END;
$$;

-- Function to set credits (for reset)
CREATE OR REPLACE FUNCTION set_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE user_profiles
  SET credits = p_amount, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING credits INTO new_credits;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, new_credits;
END;
$$;

-- Function to increment API key usage and deduct credits from user
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  p_key_id UUID,
  p_credits INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from API key
  SELECT user_id INTO v_user_id
  FROM api_keys
  WHERE id = p_key_id;
  
  -- Update API key stats
  UPDATE api_keys
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    credits_consumed = COALESCE(credits_consumed, 0) + p_credits,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_key_id;
  
  -- Deduct credits from user
  IF v_user_id IS NOT NULL THEN
    UPDATE user_profiles
    SET credits = GREATEST(0, credits - p_credits), updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;
END;
$$;
