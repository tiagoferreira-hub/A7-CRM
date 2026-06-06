-- M-B — Programa de Indicação (v1)
-- Liga um lead indicado ao lead/cliente que o indicou. Reaproveita origin='indicacao'.
-- A captação pública self-service (link que o cliente compartilha) virá numa Edge Function
-- (v2) usando o id do indicador em ?ref=... — documentado no roadmap.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS referred_by_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_referred_by
  ON public.leads(company_id, referred_by_lead_id);
