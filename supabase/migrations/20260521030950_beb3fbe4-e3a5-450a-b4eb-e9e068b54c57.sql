
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
    SET last_message = NEW.body,
        last_message_at = NEW.sent_at,
        unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
        status = CASE WHEN NEW.direction = 'inbound' THEN 'open' ELSE status END,
        awaiting_reply = CASE
          WHEN NEW.direction = 'inbound' THEN false
          WHEN NEW.direction = 'outbound' THEN true
          ELSE awaiting_reply END,
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
