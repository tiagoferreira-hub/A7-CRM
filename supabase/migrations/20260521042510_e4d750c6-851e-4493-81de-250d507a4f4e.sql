
-- Playbooks
CREATE TABLE public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  view_mode TEXT NOT NULL DEFAULT 'document',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  flow_nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select playbooks" ON public.playbooks FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert playbooks" ON public.playbooks FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update playbooks" ON public.playbooks FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete playbooks" ON public.playbooks FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all playbooks" ON public.playbooks FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));
CREATE TRIGGER update_playbooks_updated_at BEFORE UPDATE ON public.playbooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scripts
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select scripts" ON public.scripts FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert scripts" ON public.scripts FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update scripts" ON public.scripts FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete scripts" ON public.scripts FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all scripts" ON public.scripts FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));
CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Enforce one active script per stage per company
CREATE UNIQUE INDEX scripts_one_active_per_stage ON public.scripts (company_id, stage) WHERE is_active = true;

-- Script usage
CREATE TABLE public.script_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  script_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  used_by UUID,
  lead_stage_at_use TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.script_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select script_usage" ON public.script_usage FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert script_usage" ON public.script_usage FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all script_usage" ON public.script_usage FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));
CREATE INDEX idx_script_usage_script ON public.script_usage(script_id);
CREATE INDEX idx_script_usage_lead ON public.script_usage(lead_id);
