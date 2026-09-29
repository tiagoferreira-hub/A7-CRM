-- F5 — Script em PASSOS: cada momento tem vários scripts ativos, em ordem.
--
-- Antes (20260929120000): 1 script ativo por momento. A primeira resposta inteira
-- (saudação, diagnóstico por procedimento, card, valor...) cabia num script só,
-- separada por títulos "#". Ficava uma lista enorme e difícil de achar.
-- Agora: cada passo é um script (ex.: "Saudação — sem nome", "Botox — diagnóstico").
-- Todos os ativos do momento aparecem no painel, na ordem de `position`, e cada
-- passo tem seus próprios usos e conversão na aba Resultados.
--
-- Idempotente. Seguro antes do merge: o código atual não depende da exclusividade.

-- ── 1) Ordem no painel ──────────────────────────────────────────────────────
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Scripts que já existiam: ordem de criação dentro de cada momento, de 10 em 10
-- (sobra espaço para encaixar passos novos no meio sem renumerar tudo).
UPDATE public.scripts s
SET position = o.pos
FROM (
  SELECT id, row_number() OVER (PARTITION BY company_id, moment ORDER BY created_at, id) * 10 AS pos
  FROM public.scripts
) o
WHERE s.id = o.id AND s.position = 0;

-- ── 2) Trilha: variação por procedimento ────────────────────────────────────
-- NULL = passo geral (vale para qualquer paciente). Preenchido = passo de uma
-- trilha (ex.: 'Botox'); o painel mostra só a trilha do procedimento do lead.
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS trilha text;

-- ── 3) Fim da exclusividade: vários ativos por momento ──────────────────────
DROP INDEX IF EXISTS public.scripts_one_active_per_moment;

CREATE INDEX IF NOT EXISTS idx_scripts_company_moment_position
  ON public.scripts (company_id, moment, position);
