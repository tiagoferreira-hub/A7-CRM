-- D2 — Reativação personalizada pelo procedimento de interesse.
-- Um lead pode indicar qual procedimento chamou atenção (ex.: "vi o botox no Instagram").
-- Isso permite que os fluxos de reativação usem {procedimento} na mensagem,
-- tornando-a muito mais pessoal do que um texto genérico.

-- 1) Coluna na tabela leads.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS procedure_interest_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_procedure_interest
  ON public.leads(company_id, procedure_interest_id)
  WHERE procedure_interest_id IS NOT NULL;

-- 2) Extende o executor C1 para substituir {procedimento} usando o interest do lead.
--    (Re-cria a função com a nova variável; compatível com a versão anterior.)
CREATE OR REPLACE FUNCTION public.run_automation_flows(
  p_trigger text, p_company uuid, p_lead uuid, p_new_stage text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fl record; st record;
  v_when timestamptz; v_actions int; v_title text; v_msg text; v_stage text; v_assignee uuid;
  v_lead_name text; v_proc_interest text;
BEGIN
  SELECT l.name, p.name
    INTO v_lead_name, v_proc_interest
    FROM public.leads l
    LEFT JOIN public.procedures p ON p.id = l.procedure_interest_id
  WHERE l.id = p_lead;

  FOR fl IN
    SELECT * FROM public.automation_flows
    WHERE company_id = p_company AND status = 'ativo' AND trigger_type = p_trigger
  LOOP
    IF p_trigger = 'stage_changed'
       AND COALESCE(fl.trigger_config->>'stage','') <> ''
       AND fl.trigger_config->>'stage' <> COALESCE(p_new_stage,'') THEN
      CONTINUE;
    END IF;

    v_actions := 0;
    FOR st IN SELECT * FROM public.automation_flow_steps WHERE flow_id = fl.id ORDER BY order_index LOOP
      v_when := now() + (COALESCE(st.delay_minutes,0) || ' minutes')::interval;

      IF st.action_type IN ('create_task','notify') THEN
        v_title := COALESCE(NULLIF(st.action_config->>'title',''), NULLIF(st.action_config->>'message',''), fl.name);
        v_title := replace(v_title, '{nome}', COALESCE(v_lead_name,''));
        v_title := replace(v_title, '{procedimento}', COALESCE(v_proc_interest,''));
        INSERT INTO public.tasks (company_id, title, lead_id, assigned_to, due_date, status)
        VALUES (p_company, v_title, p_lead, NULLIF(st.action_config->>'userId','')::uuid, v_when, 'todo');
        v_actions := v_actions + 1;

      ELSIF st.action_type IN ('send_whatsapp','send_email') THEN
        v_msg := COALESCE(st.action_config->>'message','');
        v_msg := replace(v_msg, '{nome}', COALESCE(v_lead_name,''));
        v_msg := replace(v_msg, '{procedimento}', COALESCE(v_proc_interest,''));
        INSERT INTO public.follow_ups (company_id, lead_id, scheduled_at, notes, status)
        VALUES (p_company, p_lead, v_when, '[Automação: ' || fl.name || '] ' || v_msg, 'pendente');
        v_actions := v_actions + 1;

      ELSIF st.action_type = 'change_stage' THEN
        v_stage := st.action_config->>'stage';
        IF v_stage IS NOT NULL THEN
          UPDATE public.leads SET stage = v_stage, updated_at = now() WHERE id = p_lead AND stage <> v_stage;
          v_actions := v_actions + 1;
        END IF;

      ELSIF st.action_type = 'assign' THEN
        v_assignee := NULLIF(st.action_config->>'userId','')::uuid;
        UPDATE public.leads SET assigned_to = v_assignee WHERE id = p_lead;
        v_actions := v_actions + 1;
      END IF;
    END LOOP;

    INSERT INTO public.workflow_runs (company_id, flow_id, lead_id, trigger_type, status, result)
    VALUES (p_company, fl.id, p_lead, p_trigger, 'done', jsonb_build_object('actions', v_actions));
  END LOOP;
END;
$$;

-- 3) Extende run_time_based_reminders para incluir o procedimento de interesse no
--    lembrete de "sem resposta", tornando-o mais pessoal.
CREATE OR REPLACE FUNCTION public.run_time_based_reminders(p_company uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  co record; s record; r record;
BEGIN
  FOR co IN SELECT id FROM public.companies WHERE p_company IS NULL OR id = p_company LOOP
    SELECT * INTO s FROM public.automation_settings WHERE company_id = co.id;
    IF NOT FOUND THEN
      INSERT INTO public.automation_settings (company_id) VALUES (co.id) ON CONFLICT (company_id) DO NOTHING;
      SELECT * INTO s FROM public.automation_settings WHERE company_id = co.id;
    END IF;
    IF NOT s.reminders_enabled THEN CONTINUE; END IF;

    -- A) RECALL de planos recorrentes
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
        AND (a.scheduled_at + (p.recurrence_days || ' days')::interval)
              <= now() + (s.recall_lead_window_days || ' days')::interval
        AND NOT EXISTS (SELECT 1 FROM public.follow_ups f WHERE f.source='recall' AND f.source_ref=a.id)
        AND NOT EXISTS (
          SELECT 1 FROM public.appointments a2
          WHERE a2.lead_id=a.lead_id AND a2.procedure_id=a.procedure_id
            AND a2.status='compareceu' AND a2.scheduled_at > a.scheduled_at)
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

    -- B) SEM RESPOSTA há X dias (inclui procedimento de interesse se existir)
    FOR r IN
      SELECT l.id AS lead_id, l.company_id, l.assigned_to, l.name AS lead_name,
             l.stage, p.name AS proc_interest
      FROM public.leads l
      LEFT JOIN public.procedures p ON p.id = l.procedure_interest_id
      WHERE l.company_id = co.id
        AND l.stage IN ('lead_entrou','hot_lead','agendado')
        AND l.last_interaction < now() - (s.no_reply_days || ' days')::interval
        AND NOT EXISTS (
          SELECT 1 FROM public.follow_ups f
          WHERE f.source='no_reply' AND f.source_ref=l.id AND f.status='pendente')
    LOOP
      INSERT INTO public.follow_ups
        (company_id, lead_id, assigned_to, created_by, scheduled_at, notes, status, source, source_ref)
      VALUES (
        r.company_id, r.lead_id, r.assigned_to, r.assigned_to, now(),
        '[Sem resposta] ' || COALESCE(r.lead_name,'Lead')
          || ' está há ' || s.no_reply_days || '+ dias sem interação (etapa: ' || r.stage || ')'
          || CASE WHEN r.proc_interest IS NOT NULL
               THEN ' — interesse em: ' || r.proc_interest || '. Mencionar na reativação!'
               ELSE '.' END,
        'pendente', 'no_reply', r.lead_id);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 4) Fluxo-modelo "Reativação por procedimento" para novas companies e as existentes.
--    (Semelhante ao bloco DO na migration C1, mas só cria se ainda não existir.)
DO $$
DECLARE c record; fid uuid;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    IF NOT EXISTS (SELECT 1 FROM public.automation_flows
                   WHERE company_id=c.id AND name='Reativação por procedimento') THEN
      INSERT INTO public.automation_flows (company_id, name, trigger_type, trigger_config, status)
        VALUES (c.id, 'Reativação por procedimento', 'stage_changed',
                '{"stage":"lead_frio"}'::jsonb, 'rascunho') RETURNING id INTO fid;
      INSERT INTO public.automation_flow_steps
        (flow_id, company_id, order_index, delay_minutes, action_type, action_config)
      VALUES
        (fid, c.id, 0, 0, 'send_whatsapp',
         '{"message":"Oi {nome}! 💚 Vi que você se interessou por {procedimento}. Tenho uma condição especial só para você retornar — posso te mandar os detalhes?"}'::jsonb),
        (fid, c.id, 1, 1440, 'create_task',
         '{"title":"Follow-up: {nome} se interessou por {procedimento}"}'::jsonb);
    END IF;
  END LOOP;
END $$;
