
-- 1. Add loss_reason to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason text;

-- 2. follow_ups
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  assigned_to uuid,
  created_by uuid,
  scheduled_at timestamptz NOT NULL,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select follow_ups" ON public.follow_ups FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert follow_ups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update follow_ups" ON public.follow_ups FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete follow_ups" ON public.follow_ups FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all follow_ups" ON public.follow_ups FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));
CREATE TRIGGER trg_follow_ups_updated BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'agendado',
  scheduled_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  replied_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select campaigns" ON public.campaigns FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete campaigns" ON public.campaigns FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all campaigns" ON public.campaigns FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. lead_tags
CREATE TABLE public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select lead_tags" ON public.lead_tags FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert lead_tags" ON public.lead_tags FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update lead_tags" ON public.lead_tags FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete lead_tags" ON public.lead_tags FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all lead_tags" ON public.lead_tags FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

-- 5. lead_tag_assignments
CREATE TABLE public.lead_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, tag_id)
);
ALTER TABLE public.lead_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select lta" ON public.lead_tag_assignments FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert lta" ON public.lead_tag_assignments FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete lta" ON public.lead_tag_assignments FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all lta" ON public.lead_tag_assignments FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

-- 6. lead_history
CREATE TABLE public.lead_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select lead_history" ON public.lead_history FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert lead_history" ON public.lead_history FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all lead_history" ON public.lead_history FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));
CREATE INDEX idx_lead_history_lead ON public.lead_history(lead_id, created_at DESC);

-- 7. Triggers to record history on leads
CREATE OR REPLACE FUNCTION public.record_lead_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
    VALUES (NEW.company_id, NEW.id, 'created', auth.uid(), jsonb_build_object('stage', NEW.stage, 'origin', NEW.origin));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
      INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
      VALUES (NEW.company_id, NEW.id, 'stage_changed', auth.uid(),
        jsonb_build_object('from', OLD.stage, 'to', NEW.stage, 'loss_reason', NEW.loss_reason));
      IF NEW.stage = 'perdido' AND NEW.loss_reason IS NOT NULL THEN
        INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
        VALUES (NEW.company_id, NEW.id, 'lost_reason', auth.uid(), jsonb_build_object('reason', NEW.loss_reason));
      END IF;
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
      VALUES (NEW.company_id, NEW.id, 'assignee_changed', auth.uid(),
        jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lead_history AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.record_lead_history();

-- 8. Trigger appointments -> history
CREATE OR REPLACE FUNCTION public.record_appointment_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
  VALUES (NEW.company_id, NEW.lead_id, 'appointment_created', auth.uid(),
    jsonb_build_object('scheduled_at', NEW.scheduled_at, 'type', NEW.appointment_type));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_appt_history AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.record_appointment_history();

-- 9. Trigger follow_ups -> history
CREATE OR REPLACE FUNCTION public.record_followup_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
    VALUES (NEW.company_id, NEW.lead_id, 'followup_created', auth.uid(),
      jsonb_build_object('scheduled_at', NEW.scheduled_at, 'notes', NEW.notes));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'concluido' AND OLD.status <> 'concluido' THEN
    INSERT INTO public.lead_history (company_id, lead_id, event_type, actor_id, payload)
    VALUES (NEW.company_id, NEW.lead_id, 'followup_completed', auth.uid(),
      jsonb_build_object('scheduled_at', NEW.scheduled_at));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_followup_history AFTER INSERT OR UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.record_followup_history();
