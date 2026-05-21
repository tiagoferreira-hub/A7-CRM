-- Attach timing triggers to messages
DROP TRIGGER IF EXISTS trg_handle_new_message ON public.messages;
DROP TRIGGER IF EXISTS trg_compute_message_timing ON public.messages;
DROP TRIGGER IF EXISTS trg_update_conversation_metrics ON public.messages;
DROP TRIGGER IF EXISTS trg_record_conversation_status_change ON public.conversations;

CREATE TRIGGER trg_compute_message_timing
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.compute_message_timing();

CREATE TRIGGER trg_handle_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

CREATE TRIGGER trg_update_conversation_metrics
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_metrics();

CREATE TRIGGER trg_record_conversation_status_change
  AFTER UPDATE OF status ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.record_conversation_status_change();