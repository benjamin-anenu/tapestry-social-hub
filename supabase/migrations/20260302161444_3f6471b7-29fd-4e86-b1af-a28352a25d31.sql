
-- Add challenge_target_id to chicken_games for friend-specific challenges
ALTER TABLE public.chicken_games
ADD COLUMN challenge_target_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for fast lookup of pending challenges for a specific player
CREATE INDEX idx_chicken_games_challenge_target ON public.chicken_games(challenge_target_id) WHERE challenge_target_id IS NOT NULL;
