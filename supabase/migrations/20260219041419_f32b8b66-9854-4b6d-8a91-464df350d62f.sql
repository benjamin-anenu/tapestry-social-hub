-- Make user_b_id nullable for the waiting room pattern
ALTER TABLE public.vibe_sessions ALTER COLUMN user_b_id DROP NOT NULL;