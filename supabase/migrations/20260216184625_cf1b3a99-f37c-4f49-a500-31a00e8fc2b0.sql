
-- Fix: games should only be insertable by authenticated users who are participants
DROP POLICY "System can create games" ON public.games;
CREATE POLICY "Authenticated users can create games"
  ON public.games FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      hunter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR hunted_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
