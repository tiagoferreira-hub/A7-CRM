-- GRUPO B2 + D1 — Liga agendamento → procedimento e gera o pós-operatório automático.
-- Quando um agendamento com procedimento é marcado "compareceu", o cronograma
-- pós-procedimento do catálogo vira follow-ups agendados (na fila que a equipe já usa),
-- com a mensagem personalizada por {nome} e {procedimento}. Sem cron/Edge Function.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_procedure ON public.appointments(procedure_id);

CREATE OR REPLACE FUNCTION public.schedule_postop_followups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fu          record;
  v_lead_name text;
  v_proc_name text;
  v_msg       text;
BEGIN
  -- Só dispara na transição para "compareceu" e se houver procedimento vinculado.
  IF NEW.procedure_id IS NULL THEN RETURN NEW; END IF;
  IF NOT (TG_OP = 'UPDATE' AND NEW.status = 'compareceu' AND OLD.status IS DISTINCT FROM 'compareceu') THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_lead_name FROM public.leads WHERE id = NEW.lead_id;
  SELECT name INTO v_proc_name FROM public.procedures WHERE id = NEW.procedure_id;

  FOR fu IN
    SELECT * FROM public.procedure_followups
    WHERE procedure_id = NEW.procedure_id
    ORDER BY order_index, offset_days
  LOOP
    v_msg := COALESCE(NULLIF(fu.message_template, ''), fu.title, '');
    v_msg := replace(v_msg, '{nome}', COALESCE(v_lead_name, ''));
    v_msg := replace(v_msg, '{procedimento}', COALESCE(v_proc_name, ''));

    INSERT INTO public.follow_ups
      (company_id, lead_id, assigned_to, created_by, scheduled_at, notes, status)
    VALUES (
      NEW.company_id,
      NEW.lead_id,
      NEW.assigned_to,
      NEW.assigned_to,
      NEW.scheduled_at + (fu.offset_days || ' days')::interval,
      '[Pós-' || COALESCE(v_proc_name, 'procedimento') || '] '
        || COALESCE(NULLIF(fu.title, ''), 'Acompanhamento')
        || CASE WHEN v_msg <> '' THEN E'\n' || v_msg ELSE '' END,
      'pendente'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_postop ON public.appointments;
CREATE TRIGGER trg_schedule_postop
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.schedule_postop_followups();
