
-- Add new columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS first_message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_interaction_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_conversation_id text;

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp',
  external_id text,
  assigned_to uuid,
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users select conversations" ON public.conversations
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete conversations" ON public.conversations
  FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all conversations" ON public.conversations
  FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'inbound',
  body text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users select messages" ON public.messages
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete messages" ON public.messages
  FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all messages" ON public.messages
  FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON public.conversations(company_id, last_message_at DESC);

-- Trigger: update conversation + lead when message inserted
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
    SET last_message = NEW.body,
        last_message_at = NEW.sent_at,
        unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
        updated_at = now()
    WHERE id = NEW.conversation_id;

  UPDATE public.leads l
    SET last_message = NEW.body,
        last_interaction = NEW.sent_at,
        first_message = CASE WHEN COALESCE(l.first_message,'') = '' THEN NEW.body ELSE l.first_message END,
        first_interaction_at = COALESCE(l.first_interaction_at, NEW.sent_at),
        updated_at = now()
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id AND l.id = c.lead_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_message ON public.messages;
CREATE TRIGGER trg_handle_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
