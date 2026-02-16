
-- Drop the FK constraint on profiles.user_id since this app is wallet-native (no auth.users)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
