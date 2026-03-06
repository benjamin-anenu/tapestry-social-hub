
-- Fix direct_messages: restrict to sender/receiver only
DROP POLICY IF EXISTS "Anyone can view messages" ON public.direct_messages;
CREATE POLICY "Users can view own messages"
  ON public.direct_messages FOR SELECT
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Fix conversations: restrict to participants only
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (
    participant_a IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR participant_b IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Admin wallets: explicit deny-all for client access (edge functions use service role, bypassing RLS)
CREATE POLICY "No direct client access to admin_wallets"
  ON public.admin_wallets FOR SELECT
  USING (false);
