-- 30x30 Activity Streak Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create strava_connections table
CREATE TABLE IF NOT EXISTS strava_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  strava_athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create garmin_connections table
CREATE TABLE IF NOT EXISTS garmin_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  garmin_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  access_token_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table (individual activities from various sources)
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual', -- 'strava', 'garmin', 'manual'
  external_activity_id TEXT, -- External ID from Strava/Garmin (nullable for manual)
  activity_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  notes TEXT, -- Optional notes for manual entries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for external activities (excludes manual entries with null external_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_source_external_id 
  ON activities(source, external_activity_id) 
  WHERE external_activity_id IS NOT NULL;

-- Create daily_activities table (aggregated daily stats)
CREATE TABLE IF NOT EXISTS daily_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_valid BOOLEAN GENERATED ALWAYS AS (total_duration_minutes >= 30) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

-- Create streaks table
CREATE TABLE IF NOT EXISTS streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create challenge_settings table (singleton for challenge date range)
CREATE TABLE IF NOT EXISTS challenge_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (start_date <= end_date)
);

-- Seed singleton challenge settings row
INSERT INTO challenge_settings (id, start_date, end_date)
VALUES (1, CURRENT_DATE, CURRENT_DATE + INTERVAL '29 day')
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date ON daily_activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_streaks_current ON streaks(current_streak DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_strava_connections_updated_at ON strava_connections;
CREATE TRIGGER update_strava_connections_updated_at BEFORE UPDATE ON strava_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_garmin_connections_updated_at ON garmin_connections;
CREATE TRIGGER update_garmin_connections_updated_at BEFORE UPDATE ON garmin_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_activities_updated_at ON daily_activities;
CREATE TRIGGER update_daily_activities_updated_at BEFORE UPDATE ON daily_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_streaks_updated_at ON streaks;
CREATE TRIGGER update_streaks_updated_at BEFORE UPDATE ON streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_challenge_settings_updated_at ON challenge_settings;
CREATE TRIGGER update_challenge_settings_updated_at BEFORE UPDATE ON challenge_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE garmin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "System can create profiles for new users" ON profiles;
CREATE POLICY "System can create profiles for new users" ON profiles
  FOR INSERT WITH CHECK (true);

-- Strava connections policies (private to user)
DROP POLICY IF EXISTS "Users can view own strava connection" ON strava_connections;
CREATE POLICY "Users can view own strava connection" ON strava_connections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own strava connection" ON strava_connections;
CREATE POLICY "Users can insert own strava connection" ON strava_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own strava connection" ON strava_connections;
CREATE POLICY "Users can update own strava connection" ON strava_connections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own strava connection" ON strava_connections;
CREATE POLICY "Users can delete own strava connection" ON strava_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Garmin connections policies (private to user)
DROP POLICY IF EXISTS "Users can view own garmin connection" ON garmin_connections;
CREATE POLICY "Users can view own garmin connection" ON garmin_connections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own garmin connection" ON garmin_connections;
CREATE POLICY "Users can insert own garmin connection" ON garmin_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own garmin connection" ON garmin_connections;
CREATE POLICY "Users can update own garmin connection" ON garmin_connections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own garmin connection" ON garmin_connections;
CREATE POLICY "Users can delete own garmin connection" ON garmin_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Activities policies
DROP POLICY IF EXISTS "Users can view own activities" ON activities;
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activities" ON activities;
CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activities" ON activities;
CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- Daily activities policies
DROP POLICY IF EXISTS "Users can view own daily activities" ON daily_activities;
CREATE POLICY "Users can view own daily activities" ON daily_activities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public users daily activities viewable by everyone" ON daily_activities;
CREATE POLICY "Public users daily activities viewable by everyone" ON daily_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = daily_activities.user_id AND profiles.is_public = true)
  );

DROP POLICY IF EXISTS "Users can insert own daily activities" ON daily_activities;
CREATE POLICY "Users can insert own daily activities" ON daily_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily activities" ON daily_activities;
CREATE POLICY "Users can update own daily activities" ON daily_activities
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily activities" ON daily_activities;
CREATE POLICY "Users can delete own daily activities" ON daily_activities
  FOR DELETE USING (auth.uid() = user_id);

-- Streaks policies
DROP POLICY IF EXISTS "Users can view own streaks" ON streaks;
CREATE POLICY "Users can view own streaks" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public users streaks viewable by everyone" ON streaks;
CREATE POLICY "Public users streaks viewable by everyone" ON streaks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = streaks.user_id AND profiles.is_public = true)
  );

DROP POLICY IF EXISTS "System can create streaks for new users" ON streaks;
CREATE POLICY "System can create streaks for new users" ON streaks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own streaks" ON streaks;
CREATE POLICY "Users can update own streaks" ON streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Helper to evaluate whether the authenticated user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Admin read policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all activities" ON activities;
CREATE POLICY "Admins can view all activities" ON activities
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all daily activities" ON daily_activities;
CREATE POLICY "Admins can view all daily activities" ON daily_activities
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all streaks" ON streaks;
CREATE POLICY "Admins can view all streaks" ON streaks
  FOR SELECT USING (is_admin());

-- Challenge settings policies
DROP POLICY IF EXISTS "Authenticated users can view challenge settings" ON challenge_settings;
CREATE POLICY "Authenticated users can view challenge settings" ON challenge_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view challenge settings" ON challenge_settings;

DROP POLICY IF EXISTS "Admins can update challenge settings" ON challenge_settings;
CREATE POLICY "Admins can update challenge settings" ON challenge_settings
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Update handle_new_user function to also create streak record
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with username from metadata if provided
  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'username', NULL)
  );
  
  INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (NEW.id, 0, 0, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_last_date DATE;
  v_prev_date DATE := NULL;
  v_streak_count INTEGER := 0;
  r RECORD;
BEGIN
  -- Get the current longest streak
  SELECT longest_streak INTO v_longest_streak
  FROM streaks WHERE user_id = p_user_id;
  
  IF v_longest_streak IS NULL THEN
    v_longest_streak := 0;
  END IF;

  -- Calculate streak from valid days
  FOR r IN 
    SELECT activity_date FROM daily_activities 
    WHERE user_id = p_user_id AND is_valid = true 
    ORDER BY activity_date DESC
  LOOP
    IF v_prev_date IS NULL THEN
      -- First valid day
      v_streak_count := 1;
      v_last_date := r.activity_date;
    ELSIF r.activity_date = v_prev_date - INTERVAL '1 day' THEN
      -- Consecutive day
      v_streak_count := v_streak_count + 1;
    ELSE
      -- Gap in streak, stop counting current streak
      EXIT;
    END IF;
    v_prev_date := r.activity_date;
  END LOOP;

  -- Check if streak is still active (last activity within 1 day)
  IF v_last_date IS NOT NULL AND v_last_date >= CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_streak_count;
  ELSE
    v_current_streak := 0;
  END IF;

  -- Update longest streak if current is higher
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Upsert streak record
  INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
  VALUES (p_user_id, v_current_streak, v_longest_streak, v_last_date, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_activity_date = EXCLUDED.last_activity_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for leaderboard
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  s.current_streak,
  COALESCE((
    SELECT SUM(da.total_duration_minutes)
    FROM daily_activities da
    WHERE da.user_id = p.id
  ), 0)::INTEGER as total_minutes,
  (SELECT COUNT(*) FROM daily_activities da WHERE da.user_id = p.id AND da.is_valid = true)::INTEGER as total_valid_days
FROM profiles p
JOIN streaks s ON p.id = s.user_id
WHERE p.is_public = true
ORDER BY s.current_streak DESC, total_minutes DESC, total_valid_days DESC;
