-- ==============================================================================
-- Be HERE — Database Schema, RLS Policies & RPC Functions
-- Migration: 20260101000000_init_schema.sql
-- Idempotent & Production-Ready
-- ==============================================================================

-- 1. ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_type') THEN
    CREATE TYPE memory_type AS ENUM ('photo', 'video', 'letter');
  END IF;
END $$;

-- 2. TABLES

-- Profiles (synced with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Locations directory and cache (from Overpass API)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id BIGINT UNIQUE,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_hierarchy 
ON public.locations (country, city, district);

-- Memories (Photos, Videos, Letters)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  type memory_type NOT NULL,
  title TEXT NOT NULL,
  media_url TEXT,
  letter_text VARCHAR(500),
  is_private BOOLEAN DEFAULT false NOT NULL,
  unlock_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_letter_len CHECK (char_length(letter_text) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_memories_location ON public.memories (location_id);
CREATE INDEX IF NOT EXISTS idx_memories_user ON public.memories (user_id);
CREATE INDEX IF NOT EXISTS idx_memories_unlock ON public.memories (unlock_date, is_private);

-- Comments on memories
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_memory ON public.comments (memory_id);

-- Wishes (Global warmth module)
CREATE TABLE IF NOT EXISTS public.wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AI Historical Audio Stories Cache
CREATE TABLE IF NOT EXISTS public.audio_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. AUTH TRIGGER: Automatically create profile upon user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_nickname TEXT;
BEGIN
  desired_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    split_part(NEW.email, '@', 1)
  );

  -- Ensure nickname uniqueness if already taken
  IF EXISTS (SELECT 1 FROM public.profiles WHERE nickname = desired_nickname) THEN
    desired_nickname := desired_nickname || '_' || substring(NEW.id::text from 1 for 4);
  END IF;

  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, desired_nickname)
  ON CONFLICT (id) DO UPDATE SET
    nickname = EXCLUDED.nickname;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Locations are viewable by everyone" ON public.locations;
CREATE POLICY "Locations are viewable by everyone"
ON public.locations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users and service can insert locations" ON public.locations;
CREATE POLICY "Authenticated users and service can insert locations"
ON public.locations FOR INSERT
WITH CHECK (true);

-- Memories
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- 1) Public unlocked memories visible to everyone (Guests & Authenticated)
DROP POLICY IF EXISTS "Public unlocked memories are visible to everyone" ON public.memories;
CREATE POLICY "Public unlocked memories are visible to everyone"
ON public.memories FOR SELECT
USING (is_private = false AND unlock_date <= now());

-- 2) Author can read own unlocked private letters
DROP POLICY IF EXISTS "Users can read own unlocked private letters" ON public.memories;
CREATE POLICY "Users can read own unlocked private letters"
ON public.memories FOR SELECT
USING (auth.uid() = user_id AND unlock_date <= now());

-- 3) Authenticated users can insert own memories
DROP POLICY IF EXISTS "Authenticated users can insert own memories" ON public.memories;
CREATE POLICY "Authenticated users can insert own memories"
ON public.memories FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4) Users can delete own memories
DROP POLICY IF EXISTS "Users can delete own memories" ON public.memories;
CREATE POLICY "Users can delete own memories"
ON public.memories FOR DELETE
USING (auth.uid() = user_id);

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone"
ON public.comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- Wishes
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wishes are viewable by everyone" ON public.wishes;
CREATE POLICY "Wishes are viewable by everyone"
ON public.wishes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert wishes" ON public.wishes;
CREATE POLICY "Authenticated users can insert wishes"
ON public.wishes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Audio Stories
ALTER TABLE public.audio_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audio stories are viewable by everyone" ON public.audio_stories;
CREATE POLICY "Audio stories are viewable by everyone"
ON public.audio_stories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service and authenticated users can insert audio stories" ON public.audio_stories;
CREATE POLICY "Service and authenticated users can insert audio stories"
ON public.audio_stories FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Service and authenticated users can update audio stories" ON public.audio_stories;
CREATE POLICY "Service and authenticated users can update audio stories"
ON public.audio_stories FOR UPDATE
USING (true);

-- 5. RPC FUNCTIONS (SECURITY DEFINER)

-- Count locked time capsules without exposing text
CREATE OR REPLACE FUNCTION public.get_locked_letters_count(loc_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.memories
  WHERE type = 'letter'
    AND unlock_date > now()
    AND (loc_id IS NULL OR location_id = loc_id);
$$;

-- Total registered users count for Header Hand icon
CREATE OR REPLACE FUNCTION public.get_total_users_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.profiles;
$$;

-- Author metadata for locked letters (countdown timer in User Cabinet without revealing letter_text)
CREATE OR REPLACE FUNCTION public.get_my_locked_letters()
RETURNS TABLE (
  id UUID,
  title TEXT,
  location_id UUID,
  is_private BOOLEAN,
  unlock_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, location_id, is_private, unlock_date, created_at
  FROM public.memories
  WHERE user_id = auth.uid()
    AND type = 'letter'
    AND unlock_date > now()
  ORDER BY unlock_date ASC;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_locked_letters_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_users_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_locked_letters() TO authenticated;
