
-- App settings: key-value config store
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admin wallets: authorized admin addresses
CREATE TABLE public.admin_wallets (
  wallet_address text PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

-- Seed matching mode
INSERT INTO public.app_settings (key, value) VALUES ('matching_mode', 'auto');

-- Seed admin wallet
INSERT INTO public.admin_wallets (wallet_address) VALUES ('46eC9nnfbgqhfF219js3wpHhM28igahTqoYQyumtVLWb');
