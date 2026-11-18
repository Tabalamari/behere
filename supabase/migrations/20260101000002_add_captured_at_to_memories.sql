-- Migration: Add optional captured_at date to memories table for historical & past media

ALTER TABLE public.memories 
  ADD COLUMN IF NOT EXISTS captured_at DATE;

CREATE INDEX IF NOT EXISTS idx_memories_captured_at ON public.memories (captured_at);
