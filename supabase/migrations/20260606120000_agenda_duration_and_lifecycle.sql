-- FASE 2 — Agenda
-- 1) Duração do agendamento (para a visão de calendário).
-- 2) O gatilho sync_lead_from_appointment passa a registrar a mudança de etapa em
--    lifecycle_events com trigger_type='agenda' (fecha o objetivo da FASE 0.3 para a agenda).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60;

CREATE OR REPLACE FUNCTION public.sync_lead_from_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from text;
  v_to   text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT stage INTO v_from FROM public.leads WHERE id = NEW.lead_id;
    IF v_from IS NULL OR v_from NOT IN ('compareceu','fechou') THEN
      v_to := 'agendado';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT stage INTO v_from FROM public.leads WHERE id = NEW.lead_id;
    IF NEW.status = 'compareceu' THEN
      v_to := 'compareceu';
    ELSIF NEW.status = 'remarcado' THEN
      v_to := 'agendado';
    END IF;
  END IF;

  -- Só altera + registra evento quando há mudança real de etapa.
  IF v_to IS NOT NULL AND v_to IS DISTINCT FROM v_from THEN
    UPDATE public.leads SET stage = v_to, updated_at = now() WHERE id = NEW.lead_id;
    INSERT INTO public.lifecycle_events
      (company_id, lead_id, from_stage, to_stage, trigger_type, trigger_ref, created_by)
    VALUES
      (NEW.company_id, NEW.lead_id, v_from, v_to, 'agenda', NEW.id::text, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;
