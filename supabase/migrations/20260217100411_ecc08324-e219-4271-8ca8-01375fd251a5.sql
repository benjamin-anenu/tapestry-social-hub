
-- Seed Amara Femilade bot profile
INSERT INTO public.profiles (
  user_id,
  wallet_address,
  username,
  display_name,
  real_name,
  city,
  country,
  x_handle,
  instagram_handle,
  bio_text,
  is_bot,
  is_online,
  vibe_score
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'BOT_AMARA_001',
  'queen_tapestry',
  'Amara Femilade',
  'Amara Femilade',
  'Lagos',
  'Nigeria',
  'Sol_Tapestry',
  'Sol_Tapestry',
  'Lagos girl with a big heart and zero tolerance for dull conversations 💛🇳🇬 If you can make me laugh, you''re halfway there.',
  true,
  true,
  42
) ON CONFLICT (wallet_address) DO NOTHING;
