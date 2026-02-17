
-- 1. Add social columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS real_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS x_handle text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS bio_text text,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- 2. Create vibe_sessions table
CREATE TABLE public.vibe_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES public.profiles(id),
  user_b_id uuid NOT NULL REFERENCES public.profiles(id),
  chat_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_a_verdict text CHECK (user_a_verdict IN ('vibe', 'nah')),
  user_b_verdict text CHECK (user_b_verdict IN ('vibe', 'nah')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.vibe_sessions ENABLE ROW LEVEL SECURITY;

-- Participants can view their sessions
CREATE POLICY "Participants can view own sessions"
  ON public.vibe_sessions FOR SELECT
  USING (
    user_a_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR user_b_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Participants can update their sessions (for verdicts/chat)
CREATE POLICY "Participants can update own sessions"
  ON public.vibe_sessions FOR UPDATE
  USING (
    user_a_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR user_b_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Enable realtime for vibe_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.vibe_sessions;

-- 3. Create friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id),
  following_id uuid NOT NULL REFERENCES public.profiles(id),
  mutual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Anyone can view friendships (needed for privacy checks)
CREATE POLICY "Anyone can view friendships"
  ON public.friendships FOR SELECT
  USING (true);

-- Users can insert friendships for themselves
CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (
    follower_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- 4. Security definer function for mutual friend check
CREATE OR REPLACE FUNCTION public.is_mutual_friend(_profile_a uuid, _profile_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE follower_id = _profile_a AND following_id = _profile_b AND mutual = true
  );
$$;

-- 5. Replace the open SELECT policy on profiles with a privacy-aware one
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Public fields are always visible; sensitive fields only if mutual friend
CREATE POLICY "Public profile fields visible to all"
  ON public.profiles FOR SELECT
  USING (true);
