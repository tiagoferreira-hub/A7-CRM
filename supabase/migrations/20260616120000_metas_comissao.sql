-- E — Metas/comissão por vendedor + lead scoring.
-- Tabela: sales_targets — meta mensal por vendedor com taxa de comissão.

CREATE TABLE IF NOT EXISTS public.sales_targets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_year     int         NOT NULL,
  period_month    int         NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  target_revenue  numeric(12,2) NOT NULL DEFAULT 0,
  target_leads    int           NOT NULL DEFAULT 0,
  commission_rate numeric(5,2)  NOT NULL DEFAULT 10, -- % sobre o valor do lead
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, period_year, period_month)
);

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view own company targets"
  ON public.sales_targets FOR SELECT
  USING (company_id = public.current_company_id());

CREATE POLICY "owners manage targets"
  ON public.sales_targets FOR ALL
  USING (
    company_id = public.current_company_id()
    AND public.current_role() IN ('owner','admin')
  )
  WITH CHECK (
    company_id = public.current_company_id()
    AND public.current_role() IN ('owner','admin')
  );

CREATE INDEX IF NOT EXISTS idx_sales_targets_company_period
  ON public.sales_targets (company_id, period_year, period_month);

-- Trigger para atualizar updated_at automaticamente.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_sales_targets_updated ON public.sales_targets;
CREATE TRIGGER trg_sales_targets_updated
  BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
