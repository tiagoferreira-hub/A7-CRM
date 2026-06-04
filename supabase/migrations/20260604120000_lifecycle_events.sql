-- FASE 0.3 — Eventos de lifecycle (base para automações)
-- Registra TODA mudança de etapa de um lead. Preenchido pela função única
-- moveLeadStage no frontend (LeadsContext.moveLead), que sabe a origem (trigger_type).
-- Tabela append-only: sem UPDATE/DELETE por usuários comuns.

CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id      uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage   text,
  to_stage     text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual','keyword','workflow','agenda','ai')),
  trigger_ref  text,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Multi-tenant: usuários da company veem/gravam apenas eventos da própria company.
CREATE POLICY "Company users select lifecycle_events" ON public.lifecycle_events
  FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company users insert lifecycle_events" ON public.lifecycle_events
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Owner da plataforma enxerga tudo (Painel do Proprietário).
CREATE POLICY "Owner all lifecycle_events" ON public.lifecycle_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role))
  WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_lead
  ON public.lifecycle_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_company
  ON public.lifecycle_events(company_id, created_at DESC);

-- NOTA: mudanças de etapa disparadas só no banco (ex.: trigger de appointments)
-- não passam por moveLeadStage. Quando a FASE 2 (agenda) for refeita, o evento de
-- 'agenda' deve ser gravado aqui também. Por ora o registro é feito pelo frontend.
