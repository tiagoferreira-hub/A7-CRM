-- Appointments module
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  assigned_to UUID,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  appointment_type TEXT NOT NULL DEFAULT 'avaliacao',
  status TEXT NOT NULL DEFAULT 'agendado',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users select appointments" ON public.appointments
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all appointments" ON public.appointments
  FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync lead stage when appointment status changes
CREATE OR REPLACE FUNCTION public.sync_lead_from_appointment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.leads SET stage = 'agendado', updated_at = now()
      WHERE id = NEW.lead_id AND stage NOT IN ('compareceu','fechou');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'compareceu' THEN
      UPDATE public.leads SET stage = 'compareceu', updated_at = now() WHERE id = NEW.lead_id;
    ELSIF NEW.status = 'remarcado' THEN
      UPDATE public.leads SET stage = 'agendado', updated_at = now() WHERE id = NEW.lead_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_sync_lead
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_from_appointment();

CREATE INDEX idx_appointments_company_date ON public.appointments(company_id, scheduled_at);
CREATE INDEX idx_appointments_lead ON public.appointments(lead_id);
CREATE INDEX idx_leads_company_phone ON public.leads(company_id, phone);