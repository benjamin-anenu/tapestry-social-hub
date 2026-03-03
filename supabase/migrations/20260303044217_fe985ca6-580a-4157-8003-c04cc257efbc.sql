
-- 1. admin_wallets: Enable RLS + deny all (only service role in edge functions needs access)
ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Service role bypasses RLS.

-- 2. app_settings: Enable RLS + deny all (only service role in edge functions needs access)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Service role bypasses RLS.

-- 3. conversations: Remove overly permissive UPDATE policy (edge functions handle updates via service role)
DROP POLICY IF EXISTS "Anyone can update conversations" ON public.conversations;

-- 4. direct_messages: Remove overly permissive INSERT policy (edge functions handle inserts via service role)
DROP POLICY IF EXISTS "Anyone can send messages" ON public.direct_messages;
