-- Migration: Allow public sealed time capsules to be visible on canvas with blurred content,
-- and allow authors to view all their created memories in cabinet.

DROP POLICY IF EXISTS "Public unlocked memories are visible to everyone" ON public.memories;
DROP POLICY IF EXISTS "Public memories are visible to everyone" ON public.memories;
CREATE POLICY "Public memories are visible to everyone"
ON public.memories FOR SELECT
USING (is_private = false);

DROP POLICY IF EXISTS "Users can read own unlocked private letters" ON public.memories;
DROP POLICY IF EXISTS "Users can view own memories" ON public.memories;
CREATE POLICY "Users can view own memories"
ON public.memories FOR SELECT
USING (auth.uid() = user_id);
