
-- Add trading battle columns to chicken_games
ALTER TABLE public.chicken_games
  ADD COLUMN IF NOT EXISTS price_history jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS player_a_cash numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS player_b_cash numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS player_a_tokens numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player_b_tokens numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player_a_trades jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS player_b_trades jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS game_duration integer NOT NULL DEFAULT 60;
