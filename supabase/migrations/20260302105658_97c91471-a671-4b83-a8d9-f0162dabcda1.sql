
-- Add 'chicken' to game_role enum
ALTER TYPE game_role ADD VALUE IF NOT EXISTS 'chicken';

-- Create chicken_games table
CREATE TABLE public.chicken_games (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_a_id uuid NOT NULL REFERENCES public.profiles(id),
  player_b_id uuid REFERENCES public.profiles(id),
  stake_amount numeric NOT NULL DEFAULT 0.05,
  platform_fee numeric NOT NULL DEFAULT 0,
  counter integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'depositing', 'active', 'finished')),
  player_a_deposited boolean NOT NULL DEFAULT false,
  player_b_deposited boolean NOT NULL DEFAULT false,
  player_a_tx text,
  player_b_tx text,
  cashed_out_by uuid REFERENCES public.profiles(id),
  cashed_out_at integer,
  payout_tx text,
  winner_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- Enable RLS
ALTER TABLE public.chicken_games ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone can view (spectator mode)
CREATE POLICY "Anyone can view chicken games"
  ON public.chicken_games FOR SELECT
  USING (true);

-- No direct INSERT/UPDATE/DELETE from clients - all mutations via edge functions with service role

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chicken_games;
