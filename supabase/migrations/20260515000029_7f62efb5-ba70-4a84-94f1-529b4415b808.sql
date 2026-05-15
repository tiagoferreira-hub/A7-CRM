-- Conversations v2: awaiting_reply + manual is_unread
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS awaiting_reply boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_unread boolean NOT NULL DEFAULT false;

-- Automation flows (skeleton, no execution yet)
CREATE TABLE IF NOT EXISTS public.automation_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'no_reply_days',
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  delay_minutes int NOT NULL DEFAULT 0,
  action_type text NOT NULL DEFAULT 'send_whatsapp',
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users select flows" ON public.automation_flows
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert flows" ON public.automation_flows
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update flows" ON public.automation_flows
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete flows" ON public.automation_flows
  FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all flows" ON public.automation_flows
  FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE POLICY "Company users select flow steps" ON public.automation_flow_steps
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert flow steps" ON public.automation_flow_steps
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users update flow steps" ON public.automation_flow_steps
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users delete flow steps" ON public.automation_flow_steps
  FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Owner all flow steps" ON public.automation_flow_steps
  FOR ALL TO authenticated USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE TRIGGER update_automation_flows_updated_at
  BEFORE UPDATE ON public.automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();