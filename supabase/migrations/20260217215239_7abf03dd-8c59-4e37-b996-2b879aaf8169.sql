
-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_a UUID NOT NULL REFERENCES public.profiles(id),
  participant_b UUID NOT NULL REFERENCES public.profiles(id),
  vibe_session_id UUID REFERENCES public.vibe_sessions(id),
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_a, participant_b)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own conversations"
ON public.conversations FOR SELECT
USING (
  participant_a IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR participant_b IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Participants can update own conversations"
ON public.conversations FOR UPDATE
USING (
  participant_a IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR participant_b IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Create direct_messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  text TEXT NOT NULL CHECK (char_length(text) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own messages"
ON public.direct_messages FOR SELECT
USING (
  sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authenticated users can send messages"
ON public.direct_messages FOR INSERT
WITH CHECK (
  sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Enable realtime for direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Create indexes
CREATE INDEX idx_dm_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_dm_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_dm_created ON public.direct_messages(created_at);
CREATE INDEX idx_conv_participants ON public.conversations(participant_a, participant_b);
CREATE INDEX idx_conv_last_msg ON public.conversations(last_message_at DESC NULLS LAST);
