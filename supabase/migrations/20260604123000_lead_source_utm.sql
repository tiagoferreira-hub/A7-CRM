-- FASE 1.2 — Origem do lead (canal/anúncio).
-- A coluna `channel` e `origin` já existem em leads. Aqui adicionamos os campos de
-- rastreamento de campanha (UTM + anúncio) capturados na rota pública de captação.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source        text,
  ADD COLUMN IF NOT EXISTS utm_source    text,
  ADD COLUMN IF NOT EXISTS utm_medium    text,
  ADD COLUMN IF NOT EXISTS utm_campaign  text,
  ADD COLUMN IF NOT EXISTS utm_content   text,
  ADD COLUMN IF NOT EXISTS utm_term      text,
  ADD COLUMN IF NOT EXISTS ad_id         text,
  ADD COLUMN IF NOT EXISTS referrer      text;

-- Índice para filtrar/relatar por canal.
CREATE INDEX IF NOT EXISTS idx_leads_company_channel
  ON public.leads(company_id, channel);

-- NOTA (rota pública de captação): inserir lead sem login é bloqueado pela RLS de leads
-- (exige usuário autenticado da company). A captação pública (?utm_...&channel=...) deve
-- ser feita por uma Edge Function com service_role que valida a company e grava o lead.
-- Isso é trabalho de Edge Function (relacionado à Fase 5) e fica documentado em PROGRESS.md.
-- Esta fase entrega: schema UTM, parser de query params (testado) e a UI de canal/origem.
