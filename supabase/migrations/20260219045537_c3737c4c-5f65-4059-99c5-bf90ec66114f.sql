
ALTER TABLE public.vibe_sessions ADD COLUMN IF NOT EXISTS user_a_feedback TEXT;
ALTER TABLE public.vibe_sessions ADD COLUMN IF NOT EXISTS user_b_feedback TEXT;
ALTER TABLE public.vibe_sessions ADD COLUMN IF NOT EXISTS chat_starts_at TIMESTAMPTZ;
