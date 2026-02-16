
-- Game roles enum
CREATE TYPE public.game_role AS ENUM ('hunter', 'hunted', 'duel');

-- Game status enum
CREATE TYPE public.game_status AS ENUM ('waiting', 'matched', 'in_progress', 'completed', 'abandoned');

-- Player profiles (linked to wallet address)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL UNIQUE,
  tapestry_id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  vibe_score INTEGER DEFAULT 0,
  find_score INTEGER DEFAULT 0,
  hide_score INTEGER DEFAULT 0,
  find_rate INTEGER DEFAULT 0,
  hide_streak INTEGER DEFAULT 0,
  avg_find_time INTEGER DEFAULT 0,
  hunter_points INTEGER DEFAULT 0,
  hunted_points INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_sol_earned NUMERIC(12,6) DEFAULT 0,
  total_sol_staked NUMERIC(12,6) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matchmaking queue
CREATE TABLE public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role game_role NOT NULL,
  stake_amount NUMERIC(12,6) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  matched_with UUID REFERENCES public.matchmaking_queue(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Games table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_id UUID REFERENCES public.profiles(id) NOT NULL,
  hunted_id UUID REFERENCES public.profiles(id) NOT NULL,
  role_mode game_role NOT NULL DEFAULT 'hunter',
  status game_status NOT NULL DEFAULT 'in_progress',
  hunter_stake NUMERIC(12,6) DEFAULT 0,
  hunted_stake NUMERIC(12,6) DEFAULT 0,
  bounty_base NUMERIC(12,6) DEFAULT 0.01,
  bounty_total NUMERIC(12,6) DEFAULT 0,
  time_remaining INTEGER,
  solved_at INTEGER,
  hunter_won BOOLEAN,
  puzzle_fields JSONB DEFAULT '[]',
  clues_dropped JSONB DEFAULT '[]',
  chat_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Puzzle templates (what the hunted sets up before a match)
CREATE TABLE public.puzzle_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  clues JSONB NOT NULL DEFAULT '[]',
  privacy_level TEXT NOT NULL DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzle_templates ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Matchmaking: users can manage own queue entries, see all waiting
CREATE POLICY "Users can view matchmaking queue"
  ON public.matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "Users can join queue"
  ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue entry"
  ON public.matchmaking_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave queue"
  ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);

-- Games: participants can view and update their games
CREATE POLICY "Players can view their games"
  ON public.games FOR SELECT USING (
    hunter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR hunted_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "System can create games"
  ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update their games"
  ON public.games FOR UPDATE USING (
    hunter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR hunted_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Puzzle templates: owner only
CREATE POLICY "Users can view own templates"
  ON public.puzzle_templates FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can create templates"
  ON public.puzzle_templates FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own templates"
  ON public.puzzle_templates FOR UPDATE USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own templates"
  ON public.puzzle_templates FOR DELETE USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Enable realtime for matchmaking and games
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- Timestamp update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_puzzle_templates_updated_at
  BEFORE UPDATE ON public.puzzle_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
