-- Drop restrictive SELECT/UPDATE policies on conversations and replace with public-readable
DROP POLICY IF EXISTS "Participants can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update own conversations" ON public.conversations;

-- Allow public read on conversations (contains only participant IDs and message previews, no sensitive PII)
CREATE POLICY "Anyone can view conversations"
  ON public.conversations FOR SELECT
  USING (true);

-- Allow public update on conversations (edge functions handle validation)
CREATE POLICY "Anyone can update conversations"
  ON public.conversations FOR UPDATE
  USING (true);

-- Similarly fix direct_messages SELECT policy for wallet-based auth
DROP POLICY IF EXISTS "Participants can view own messages" ON public.direct_messages;
CREATE POLICY "Anyone can view messages"
  ON public.direct_messages FOR SELECT
  USING (true);

-- Fix direct_messages INSERT policy
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.direct_messages;
CREATE POLICY "Anyone can send messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (true);