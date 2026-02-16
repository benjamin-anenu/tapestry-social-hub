
-- Add permissive SELECT policy for wallet-based users (no Supabase Auth)
CREATE POLICY "Anyone can view games"
ON public.games
FOR SELECT
USING (true);
