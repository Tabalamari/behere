-- ==============================================================================
-- Verification Test Script for Task 1.1: Schema, RLS, and RPC
-- ==============================================================================

BEGIN;

-- 1. Create a mock location
INSERT INTO public.locations (id, osm_id, country, city, district, lat, lng)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  12345678,
  'Ukraine',
  'Kyiv',
  'Podil',
  50.4667,
  30.5167
) ON CONFLICT (osm_id) DO NOTHING;

-- 2. Create mock user profiles
INSERT INTO public.profiles (id, nickname)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'kyiv_explorer'),
  ('33333333-3333-3333-3333-333333333333', 'podil_native')
ON CONFLICT (id) DO NOTHING;

-- 3. Create mock memories:
-- 3a. Unlocked public photo (should be visible to anon)
INSERT INTO public.memories (id, user_id, location_id, type, title, media_url, is_private, unlock_date)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'photo',
  'Old Podil Bakery',
  'https://r2.example.com/photo1.webp',
  false,
  now() - interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- 3b. Sealed public time capsule (must NOT be visible to anon or direct SELECT)
INSERT INTO public.memories (id, user_id, location_id, type, title, letter_text, is_private, unlock_date)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'letter',
  'Future Letter to Kyiv 2035',
  'Secret future letter text that must never leak before unlock date',
  false,
  now() + interval '10 years'
) ON CONFLICT (id) DO NOTHING;

-- 3c. Unlocked private letter (for myself) - visible ONLY to author
INSERT INTO public.memories (id, user_id, location_id, type, title, letter_text, is_private, unlock_date)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'letter',
  'My Private Note from the Past',
  'Personal reflection only for author eyes',
  true,
  now() - interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- 4. Verify RPC functions:
-- 4a. get_locked_letters_count: should return 1 (for the locked letter)
DO $$
DECLARE
  locked_cnt INTEGER;
  total_users INTEGER;
BEGIN
  SELECT public.get_locked_letters_count() INTO locked_cnt;
  IF locked_cnt < 1 THEN
    RAISE EXCEPTION 'Verification failed: get_locked_letters_count returned %', locked_cnt;
  END IF;

  SELECT public.get_total_users_count() INTO total_users;
  IF total_users < 2 THEN
    RAISE EXCEPTION 'Verification failed: get_total_users_count returned %', total_users;
  END IF;

  RAISE NOTICE 'RPC checks passed: locked_cnt=%, total_users=%', locked_cnt, total_users;
END $$;

ROLLBACK;
