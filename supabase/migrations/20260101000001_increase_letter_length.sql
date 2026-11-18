-- Migration: Increase time-capsule letter_text character limit from 500 to 2500

-- 1. Alter letter_text column to VARCHAR(2500)
ALTER TABLE public.memories 
  ALTER COLUMN letter_text TYPE VARCHAR(2500);

-- 2. Drop legacy 500-char check constraint and add updated 2500-char constraint
ALTER TABLE public.memories 
  DROP CONSTRAINT IF EXISTS chk_letter_len;

ALTER TABLE public.memories 
  ADD CONSTRAINT chk_letter_len CHECK (char_length(letter_text) <= 2500);
