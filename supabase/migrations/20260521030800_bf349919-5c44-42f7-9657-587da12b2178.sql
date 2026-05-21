
-- 1. Theme preference per user
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark';

-- 2. Conversation timer fields
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS response_time_minutes integer;

-- Backfill sender_type from direction
UPDATE public.messages SET sender_type = CASE WHEN direction = 'inbound' THEN 'lead' ELSE 'agent' END WHERE sender_type IS NULL;

-- conversation_metrics table
CREATE TABLE IF NOT EXISTS public.conversation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  conversation_id uuid NOT NULL UNIQUE,
  avg_agent_response_time numeric NOT NULL DEFAULT 0,
  avg_lead_response_time numeric NOT NULL DEFAULT 0,
  first_response_time numeric,
  total_messages integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users select metrics" ON public.conversation_metrics FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert metrics" ON public.conversation_metrics FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update metrics" ON public.conversation_metrics FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all metrics" ON public.conversation_metrics FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner')) WITH CHECK (has_role(auth.uid(), 'owner'));

-- Trigger: compute sender_type + response_time_minutes on insert, update metrics
CREATE OR REPLACE FUNCTION public.compute_message_timing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  conv RECORD;
  prev_msg RECORD;
  diff_min integer;
  is_first_agent boolean := false;
  total int;
  avg_a numeric;
  avg_l numeric;
  first_resp numeric;
BEGIN
  -- Derive sender_type if not provided
  IF NEW.sender_type IS NULL THEN
    NEW.sender_type := CASE WHEN NEW.direction = 'inbound' THEN 'lead' ELSE 'agent' END;
  END IF;

  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;

  -- Only count timing while conversation is open
  IF conv.status = 'open' THEN
    SELECT * INTO prev_msg FROM public.messages
      WHERE conversation_id = NEW.conversation_id
        AND id <> NEW.id
        AND sender_type IS DISTINCT FROM NEW.sender_type
      ORDER BY sent_at DESC LIMIT 1;

    IF FOUND THEN
      diff_min := GREATEST(0, EXTRACT(EPOCH FROM (NEW.sent_at - prev_msg.sent_at))::int / 60);
      NEW.response_time_minutes := diff_min;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_compute_timing ON public.messages;
CREATE TRIGGER messages_compute_timing BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.compute_message_timing();

-- After insert: update aggregate metrics
CREATE OR REPLACE FUNCTION public.update_conversation_metrics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total int;
  avg_a numeric;
  avg_l numeric;
  first_resp numeric;
BEGIN
  SELECT COUNT(*) INTO total FROM public.messages WHERE conversation_id = NEW.conversation_id;
  SELECT AVG(response_time_minutes) INTO avg_a FROM public.messages
    WHERE conversation_id = NEW.conversation_id AND sender_type = 'agent' AND response_time_minutes IS NOT NULL;
  SELECT AVG(response_time_minutes) INTO avg_l FROM public.messages
    WHERE conversation_id = NEW.conversation_id AND sender_type = 'lead' AND response_time_minutes IS NOT NULL;
  SELECT response_time_minutes INTO first_resp FROM public.messages
    WHERE conversation_id = NEW.conversation_id AND sender_type = 'agent' AND response_time_minutes IS NOT NULL
    ORDER BY sent_at ASC LIMIT 1;

  INSERT INTO public.conversation_metrics (company_id, conversation_id, avg_agent_response_time, avg_lead_response_time, first_response_time, total_messages, updated_at)
  VALUES (NEW.company_id, NEW.conversation_id, COALESCE(avg_a, 0), COALESCE(avg_l, 0), first_resp, total, now())
  ON CONFLICT (conversation_id) DO UPDATE
    SET avg_agent_response_time = EXCLUDED.avg_agent_response_time,
        avg_lead_response_time = EXCLUDED.avg_lead_response_time,
        first_response_time = EXCLUDED.first_response_time,
        total_messages = EXCLUDED.total_messages,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_update_metrics ON public.messages;
CREATE TRIGGER messages_update_metrics AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_metrics();

-- Ensure existing handle_new_message trigger exists on messages table
DROP TRIGGER IF EXISTS messages_handle_new ON public.messages;
CREATE TRIGGER messages_handle_new AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- Ensure conversation status change trigger exists
DROP TRIGGER IF EXISTS conversations_status_change ON public.conversations;
CREATE TRIGGER conversations_status_change AFTER UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.record_conversation_status_change();
