
-- 1. app_settings: explicit deny-all for client access (only edge functions use service role)
CREATE POLICY "No direct client access to app_settings"
  ON public.app_settings FOR SELECT
  USING (false);

-- 2. profiles: replace public-all SELECT with authenticated-only access
-- This prevents unauthenticated users from scraping wallet addresses
DROP POLICY IF EXISTS "Public profile fields visible to all" ON public.profiles;

-- Authenticated users can see all profiles (needed for game/social features)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
