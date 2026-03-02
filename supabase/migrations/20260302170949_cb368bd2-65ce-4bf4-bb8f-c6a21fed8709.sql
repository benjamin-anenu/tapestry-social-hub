-- Add profiles table to realtime publication so online status updates are pushed to clients in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;