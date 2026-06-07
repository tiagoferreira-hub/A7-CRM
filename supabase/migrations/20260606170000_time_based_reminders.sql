-- GRUPO C2 + D3 — Lembretes por TEMPO (não por evento).
-- Diferente do motor C1 (que dispara na hora que algo acontece), aqui um processo
-- agendado VARRE o banco periodicamente e cria lembretes na fila de follow-ups que a
-- equipe já usa, em dois casos:
--   A) RECALL de planos recorrentes  -> "Botox a cada 120 dias": passou o intervalo, hora de voltar.
--   B) SEM RESPOSTA há X dias        -> lead parado em etapa aberta há muito tempo: retomar contato.
-- A lógica fica numa função SQL (testável e reaproveitável); o agendamento usa pg_cron
-- (com fallback: se pg_cron não existir, a Edge Function / botão "Rodar agora" cobrem).

-- 1) Marcadores de ORIGEM nos follow-ups (permitem deduplicar sem recriar lembrete repetido).
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS source     text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref uuid;
CREATE INDEX IF NOT EXISTS idx_follow_ups_source
  ON public.follow_ups(company_id, source, source_ref);

-- 2) Configuração por empresa (limiares ajustáveis no app).
CREATE TABLE IF NOT EXISTS public.automation_settings (
  company_id              uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  reminders_enabled       boolean NOT NULL DEFAULT true,
  no_reply_days           integer NOT NULL DEFAULT 3,   -- "sem resposta há X dias"
  recall_lead_window_days integer NOT NULL DEFAULT 14,  -- antecedência p/ avisar do recall
  updated_at              timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users select autosettings" ON public.automation_settings
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Company admins insert autosettings" ON public.automation_settings
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company admins update autosettings" ON public.automation_settings
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller')
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Owner all autosettings" ON public.automation_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));

-- Cria a linha de config para empresas que já existem.
INSERT INTO public.automation_settings (company_id)
  SELECT id FROM public.companies
  ON CONFLICT (company_id) DO NOTHING;

-- 3) O "cérebro": varre e cria os lembretes. SECURITY DEFINER p/ rodar no cron e via RPC.
--    p_company NULL = todas as empresas (cron). Retorna quantos lembretes criou.
CREATE OR REPLACE FUNCTION public.run_time_based_reminders(p_company uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  co record; s record; r record;
BEGIN
  FOR co IN SELECT id FROM public.companies WHERE p_company IS NULL OR id = p_company LOOP
    -- garante config (default) e respeita o liga/desliga
    SELECT * INTO s FROM public.automation_settings WHERE company_id = co.id;
    IF NOT FOUND THEN
      INSERT INTO public.automation_settings (company_id) VALUES (co.id)
        ON CONFLICT (company_id) DO NOTHING;
      SELECT * INTO s FROM public.automation_settings WHERE company_id = co.id;
    END IF;
    IF NOT s.reminders_enabled THEN CONTINUE; END IF;

    -- A) RECALL de planos recorrentes -----------------------------------------------------
    FOR r IN
      SELECT a.id AS appt_id, a.lead_id, a.company_id, a.assigned_to,
             p.name AS proc_name, p.recurrence_days, l.name AS lead_name,
             (a.scheduled_at + (p.recurrence_days || ' days')::interval) AS due_at
      FROM public.appointments a
      JOIN public.procedures   p ON p.id = a.procedure_id
      JOIN public.leads        l ON l.id = a.lead_id
      WHERE a.company_id = co.id
        AND a.status = 'compareceu'
        AND p.is_recurring AND COALESCE(p.recurrence_days,0) > 0
        -- já entrou na janela de antecedência do recall
        AND (a.scheduled_at + (p.recurrence_days || ' days')::interval)
              <= now() + (s.recall_lead_window_days || ' days')::interval
        -- ainda não criamos recall p/ este atendimento
        AND NOT EXISTS (
          SELECT 1 FROM public.follow_ups f
          WHERE f.source = 'recall' AND f.source_ref = a.id)
        -- considera só o atendimento MAIS RECENTE desse procedimento p/ o lead
        AND NOT EXISTS (
          SELECT 1 FROM public.appointments a2
          WHERE a2.lead_id = a.lead_id AND a2.procedure_id = a.procedure_id
            AND a2.status = 'compareceu' AND a2.scheduled_at > a.scheduled_at)
    LOOP
      INSERT INTO public.follow_ups
        (company_id, lead_id, assigned_to, created_by, scheduled_at, notes, status, source, source_ref)
      VALUES (
        r.company_id, r.lead_id, r.assigned_to, r.assigned_to,
        GREATEST(r.due_at, now()),
        '[Recall: ' || r.proc_name || '] Hora de retornar! '
          || COALESCE(r.lead_name,'O cliente') || ' fez ' || r.proc_name
          || ' e o plano recomenda repetir a cada ' || r.recurrence_days || ' dias.',
        'pendente', 'recall', r.appt_id);
      v_count := v_count + 1;
    END LOOP;

    -- B) SEM RESPOSTA há X dias (D3) -------------------------------------------------------
    FOR r IN
      SELECT l.id AS lead_id, l.company_id, l.assigned_to, l.name AS lead_name, l.stage
      FROM public.leads l
      WHERE l.company_id = co.id
        AND l.stage IN ('lead_entrou','hot_lead','agendado')
        AND l.last_interaction < now() - (s.no_reply_days || ' days')::interval
        -- evita acúmulo: 1 lembrete "sem resposta" pendente por lead de cada vez
        AND NOT EXISTS (
          SELECT 1 FROM public.follow_ups f
          WHERE f.source = 'no_reply' AND f.source_ref = l.id AND f.status = 'pendente')
    LOOP
      INSERT INTO public.follow_ups
        (company_id, lead_id, assigned_to, created_by, scheduled_at, notes, status, source, source_ref)
      VALUES (
        r.company_id, r.lead_id, r.assigned_to, r.assigned_to, now(),
        '[Sem resposta] ' || COALESCE(r.lead_name,'Lead')
          || ' está há ' || s.no_reply_days || '+ dias sem interação (etapa: ' || r.stage
          || '). Retomar o contato.',
        'pendente', 'no_reply', r.lead_id);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 4) Wrapper seguro p/ o app: roda SÓ a empresa do usuário logado.
CREATE OR REPLACE FUNCTION public.request_my_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.run_time_based_reminders(public.current_company_id());
END; $$;

-- Trava: o cérebro (todas as empresas) não é chamável por usuários comuns; só o wrapper é.
REVOKE ALL ON FUNCTION public.run_time_based_reminders(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_time_based_reminders(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_my_reminders() TO authenticated;

-- 5) Agendamento diário via pg_cron (com fallback se a extensão não existir).
DO $cron$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'a7-daily-reminders') THEN
    PERFORM cron.schedule('a7-daily-reminders', '0 12 * * *',
      $job$ SELECT public.run_time_based_reminders(); $job$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponivel (%): use a Edge Function run-reminders ou o botao "Rodar agora".', SQLERRM;
END
$cron$;
