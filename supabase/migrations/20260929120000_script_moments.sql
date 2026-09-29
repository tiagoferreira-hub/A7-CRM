-- F5 — Scripts por MOMENTO do atendimento, não por etapa do funil.
--
-- Antes: 1 script ativo por etapa (scripts.stage). Isso forçava "no-show" a morar
-- em `perdido` (quem falta não está perdido) e não tinha lugar para objeções.
-- Agora:
--   - scripts.moment: o momento do atendimento (derivado no front a partir da
--     etapa + status do agendamento). 1 ativo por momento.
--   - moment = 'objecao': transversal, vários ativos, com gatilhos (scripts.triggers)
--     detectados na mensagem da paciente. Não mexe na etapa do lead.
--   - scripts.stage vira legado e opcional (objeção não tem etapa). Continua sendo
--     preenchido com a etapa-mãe do momento para o código antigo não quebrar.
--
-- Seguro para rodar ANTES do merge: um gatilho preenche `moment` quando o código
-- antigo insere só `stage`. Idempotente.

-- ── 1) Mapeamento legado etapa → momento (espelha legacyMomentFromStage no TS) ──
CREATE OR REPLACE FUNCTION public.script_moment_from_stage(_stage text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _stage
    WHEN 'lead_entrou' THEN 'primeira_resposta'
    WHEN 'hot_lead'    THEN 'agendamento'
    WHEN 'agendado'    THEN 'pre_comparecimento'
    WHEN 'compareceu'  THEN 'pos_atendimento'
    WHEN 'fechou'      THEN 'pos_venda'
    WHEN 'lead_frio'   THEN 'reativacao'
    WHEN 'perdido'     THEN 'no_show'   -- o seed antigo pendurava a recuperação de no-show aqui
    ELSE 'primeira_resposta'
  END
$$;

-- Etapa-mãe de cada momento (espelha MOMENT_HOME_STAGE no TS). Objeção: nenhuma.
CREATE OR REPLACE FUNCTION public.script_moment_home_stage(_moment text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _moment
    WHEN 'primeira_resposta'  THEN 'lead_entrou'
    WHEN 'agendamento'        THEN 'hot_lead'
    WHEN 'pre_comparecimento' THEN 'agendado'
    WHEN 'no_show'            THEN 'agendado'
    WHEN 'pos_atendimento'    THEN 'compareceu'
    WHEN 'pos_venda'          THEN 'fechou'
    WHEN 'reativacao'         THEN 'lead_frio'
    ELSE NULL
  END
$$;

-- ── 2) Colunas novas ────────────────────────────────────────────────────────
-- O índice antigo (1 ativo por etapa) sai antes: pré-comparecimento e no-show
-- dividem a etapa `agendado` e precisam poder estar ativos juntos.
DROP INDEX IF EXISTS public.scripts_one_active_per_stage;

ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS moment   text;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS triggers text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.scripts ALTER COLUMN stage DROP NOT NULL;

-- ── 3) Backfill ─────────────────────────────────────────────────────────────
UPDATE public.scripts
SET moment = public.script_moment_from_stage(stage)
WHERE moment IS NULL;

-- A recuperação de no-show pertence à etapa `agendado`, não a `perdido`.
UPDATE public.scripts SET stage = 'agendado'
WHERE moment = 'no_show' AND stage = 'perdido';

-- Defensivo: se o backfill gerou 2 ativos no mesmo momento, mantém o mais
-- recente ativo e desativa os demais (nada é apagado).
UPDATE public.scripts s
SET is_active = false
WHERE s.is_active
  AND s.moment <> 'objecao'
  AND EXISTS (
    SELECT 1 FROM public.scripts o
    WHERE o.company_id = s.company_id
      AND o.moment = s.moment
      AND o.is_active
      AND o.id <> s.id
      AND (o.updated_at, o.id) > (s.updated_at, s.id)
  );

-- ── 4) Código antigo inserindo só `stage` continua funcionando ─────────────
CREATE OR REPLACE FUNCTION public.scripts_fill_moment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.moment IS NULL THEN
    -- INSERT do código antigo, que só conhece `stage`.
    NEW.moment := public.script_moment_from_stage(NEW.stage);
  ELSIF TG_OP = 'UPDATE'
    AND NEW.stage IS DISTINCT FROM OLD.stage
    AND NEW.moment IS NOT DISTINCT FROM OLD.moment
    AND NEW.stage IS DISTINCT FROM public.script_moment_home_stage(NEW.moment) THEN
    -- UPDATE do código antigo: mudou a etapa para uma que CONTRADIZ o momento.
    -- Só aí recalcula. (Sem a última condição, gravar etapa `agendado` num
    -- script de no-show o converteria em pré-comparecimento pelo mapa legado.)
    NEW.moment := public.script_moment_from_stage(NEW.stage);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scripts_fill_moment ON public.scripts;
CREATE TRIGGER trg_scripts_fill_moment
  BEFORE INSERT OR UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.scripts_fill_moment();

-- ── 5) Restrições ───────────────────────────────────────────────────────────
ALTER TABLE public.scripts ALTER COLUMN moment SET NOT NULL;

ALTER TABLE public.scripts DROP CONSTRAINT IF EXISTS scripts_moment_check;
ALTER TABLE public.scripts ADD CONSTRAINT scripts_moment_check CHECK (moment IN (
  'primeira_resposta','agendamento','pre_comparecimento','no_show',
  'pos_atendimento','pos_venda','reativacao','objecao'
));

-- 1 script ativo por momento do funil; objeções podem ter vários ativos.
CREATE UNIQUE INDEX IF NOT EXISTS scripts_one_active_per_moment
  ON public.scripts (company_id, moment)
  WHERE is_active AND moment <> 'objecao';

-- ── 6) Objeção não é etapa ──────────────────────────────────────────────────
-- "vou pensar" / "depois" jogavam o lead em lead_frio. É objeção, com script
-- próprio — o lead segue na etapa em que estava. A regra 'depois' veio do seed
-- de 20260604122000 e ainda casava com "depois do almoço", "te mando depois"
-- e com mensagens da própria atendente. Só DESATIVA (reversível na tela de regras).
UPDATE public.keyword_rules
SET active = false
WHERE target_stage = 'lead_frio'
  AND lower(keyword) IN ('depois', 'vou pensar', 'depois eu vejo', 'agora nao', 'agora não');
