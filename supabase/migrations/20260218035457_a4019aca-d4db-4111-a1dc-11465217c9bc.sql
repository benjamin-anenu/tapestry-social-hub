
-- increment_vibe_score function
CREATE OR REPLACE FUNCTION public.increment_vibe_score(profile_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles SET vibe_score = COALESCE(vibe_score, 0) + 1 WHERE id = profile_id;
$$;

-- Unique constraint for conversations upsert
ALTER TABLE conversations ADD CONSTRAINT conversations_participants_unique UNIQUE (participant_a, participant_b);
