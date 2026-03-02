-- Expand chicken game status constraint to support challenge lifecycle states used by edge functions
ALTER TABLE public.chicken_games
DROP CONSTRAINT IF EXISTS chicken_games_status_check;

ALTER TABLE public.chicken_games
ADD CONSTRAINT chicken_games_status_check
CHECK (
  status = ANY (
    ARRAY[
      'waiting'::text,
      'challenge_pending'::text,
      'depositing'::text,
      'active'::text,
      'finished'::text,
      'declined'::text
    ]
  )
);