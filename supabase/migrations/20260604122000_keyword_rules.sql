-- FASE 1.1 — Regras de palavra-chave que mudam o lifecycle do lead.
-- Quando uma mensagem é gravada numa conversa, as regras ativas da company são varridas
-- por priority (asc) e o 1º match chama moveLeadStage(trigger='keyword').

CREATE TABLE IF NOT EXISTS public.keyword_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  keyword        text NOT NULL,
  match_type     text NOT NULL DEFAULT 'contains'
    CHECK (match_type IN ('contains','exact','regex')),
  target_stage   text NOT NULL,
  priority       integer NOT NULL DEFAULT 100,
  active         boolean NOT NULL DEFAULT true,
  allow_backward boolean NOT NULL DEFAULT false,  -- permitir retrocesso no funil? default não
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, keyword, match_type)
);

ALTER TABLE public.keyword_rules ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário da company. Escrita: bloqueada para seller (config sensível).
CREATE POLICY "Company users select keyword_rules" ON public.keyword_rules
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Company users insert keyword_rules" ON public.keyword_rules
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users update keyword_rules" ON public.keyword_rules
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users delete keyword_rules" ON public.keyword_rules
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Owner all keyword_rules" ON public.keyword_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role))
  WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE TRIGGER update_keyword_rules_updated_at
  BEFORE UPDATE ON public.keyword_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_keyword_rules_company_active
  ON public.keyword_rules(company_id, active, priority);

-- Seed de exemplos para TODAS as companies já existentes (incl. demos Bella Vita / Studio
-- Renova). Etapas-alvo usam os nomes REAIS do funil (ver src/types/lead.ts).
-- A UI também oferece "Adicionar exemplos" para companies criadas depois.
INSERT INTO public.keyword_rules (company_id, keyword, match_type, target_stage, priority, active)
SELECT c.id, v.keyword, v.match_type, v.target_stage, v.priority, true
FROM public.companies c
CROSS JOIN (VALUES
  ('agendamento marcado', 'contains', 'agendado',   10),
  ('agendado',            'contains', 'agendado',   20),
  ('fechou',              'contains', 'fechou',      10),
  ('fechado',             'contains', 'fechou',      20),
  ('pacote',              'contains', 'fechou',      30),
  ('nao tenho interesse', 'contains', 'lead_frio',   10),
  ('depois',              'contains', 'lead_frio',   90)
) AS v(keyword, match_type, target_stage, priority)
ON CONFLICT (company_id, keyword, match_type) DO NOTHING;
