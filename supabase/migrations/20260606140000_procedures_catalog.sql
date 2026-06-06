-- GRUPO B1 — Catálogo de Procedimentos (a "aba Lince").
-- Base clínica/comercial: cada procedimento guarda custo, duração, recorrência,
-- indicações/contra-indicações, info relevante E o cronograma pós-procedimento
-- (toques de acompanhamento), que depois alimenta a automação de pós-operatório.

CREATE TABLE IF NOT EXISTS public.procedures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name              text NOT NULL,
  category          text NOT NULL DEFAULT '',
  description       text NOT NULL DEFAULT '',
  price             numeric NOT NULL DEFAULT 0,          -- custo/preço
  work_minutes      integer NOT NULL DEFAULT 60,         -- tempo de trabalho
  is_recurring      boolean NOT NULL DEFAULT false,      -- plano recorrente?
  recurrence_days   integer,                             -- intervalo de recall (ex.: botox 120)
  indications       text NOT NULL DEFAULT '',
  contraindications text NOT NULL DEFAULT '',
  relevant_info     text NOT NULL DEFAULT '',
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário da company. Escrita: bloqueada para seller (config clínica).
CREATE POLICY "Company users select procedures" ON public.procedures
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Company users insert procedures" ON public.procedures
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users update procedures" ON public.procedures
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users delete procedures" ON public.procedures
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Owner all procedures" ON public.procedures
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role))
  WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE TRIGGER update_procedures_updated_at
  BEFORE UPDATE ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_procedures_company ON public.procedures(company_id, active);

-- Cronograma pós-procedimento: a "régua" de toques após realizar o procedimento.
CREATE TABLE IF NOT EXISTS public.procedure_followups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  procedure_id     uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  offset_days      integer NOT NULL DEFAULT 0,           -- dias após o procedimento
  title            text NOT NULL,
  channel          text NOT NULL DEFAULT 'mensagem'
    CHECK (channel IN ('mensagem','retorno_presencial','tarefa','avaliacao')),
  message_template text NOT NULL DEFAULT '',
  order_index      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procedure_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users select proc_followups" ON public.procedure_followups
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Company users insert proc_followups" ON public.procedure_followups
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users update proc_followups" ON public.procedure_followups
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users delete proc_followups" ON public.procedure_followups
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Owner all proc_followups" ON public.procedure_followups
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role))
  WITH CHECK (has_role(auth.uid(),'owner'::app_role));

CREATE INDEX IF NOT EXISTS idx_proc_followups_proc
  ON public.procedure_followups(procedure_id, order_index);
