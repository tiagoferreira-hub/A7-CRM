-- 1. Add services array column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}';

-- Migrate existing single service into the array
UPDATE public.leads
  SET services = ARRAY[service]
  WHERE service IS NOT NULL AND service <> '' AND (services IS NULL OR array_length(services,1) IS NULL);

-- 2. Trigger to auto-open conversation on inbound message + update last message (extends existing handle_new_message)
CREATE OR REPLACE FUNCTION public.handle_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations
    SET last_message = NEW.body,
        last_message_at = NEW.sent_at,
        unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
        status = CASE WHEN NEW.direction = 'inbound' THEN 'open' ELSE status END,
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
$function$;

-- 3. Record conversation status changes in lead_history
CREATE OR REPLACE FUNCTION public.record_conversation_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
    VALUES (NEW.company_id, NEW.lead_id,
      CASE WHEN NEW.status = 'closed' THEN 'conversation_closed' ELSE 'conversation_opened' END,
      auth.uid(),
      jsonb_build_object('conversation_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_record_conversation_status ON public.conversations;
CREATE TRIGGER trg_record_conversation_status
  AFTER UPDATE OF status ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.record_conversation_status_change();

-- Also need trigger for new messages
DROP TRIGGER IF EXISTS trg_handle_new_message ON public.messages;
CREATE TRIGGER trg_handle_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();