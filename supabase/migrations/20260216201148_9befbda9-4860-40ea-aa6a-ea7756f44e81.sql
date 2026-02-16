
-- Add is_bot to profiles
ALTER TABLE public.profiles ADD COLUMN is_bot boolean NOT NULL DEFAULT false;

-- Add is_bot_game to games
ALTER TABLE public.games ADD COLUMN is_bot_game boolean NOT NULL DEFAULT false;
