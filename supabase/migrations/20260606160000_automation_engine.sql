-- GRUPO C1 — Motor de automação por evento.
-- Executor em gatilho de banco (robusto, sem cron): quando um lead é criado ou muda de
-- etapa, roda os fluxos ATIVOS daquele tipo e executa as ações (criar tarefa, agendar
-- follow-up com a mensagem, mudar etapa, atribuir). Mensagem aceita {nome}.
-- Ações com atraso (delay) viram tarefas/follow-ups com data futura (a fila já existe).

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  flow_id      uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  lead_id      uuid,
  trigger_type text NOT NULL,
  status       text NOT NULL DEFAULT 'done',
  result       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users select workflow_runs" ON public.workflow_runs
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Owner all workflow_runs" ON public.workflow_runs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role)) WITH CHECK (has_role(auth.uid(),'owner'::app_role));
CREATE INDEX IF NOT EXISTS idx_workflow_runs_flow ON public.workflow_runs(flow_id, created_at DESC);

-- Executor: roda os fluxos ativos de um trigger para um lead.
CREATE OR REPLACE FUNCTION public.run_automation_flows(
  p_trigger text, p_company uuid, p_lead uuid, p_new_stage text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fl record; st record;
  v_when timestamptz; v_actions int; v_title text; v_msg text; v_stage text; v_assignee uuid;
  v_lead_name text;
BEGIN
  SELECT name INTO v_lead_name FROM public.leads WHERE id = p_lead;

  FOR fl IN
    SELECT * FROM public.automation_flows
    WHERE company_id = p_company AND status = 'ativo' AND trigger_type = p_trigger
  LOOP
    -- Para 'stage_changed', respeita a etapa-alvo do fluxo (se configurada).
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
        INSERT INTO public.tasks (company_id, title, lead_id, assigned_to, due_date, status)
        VALUES (p_company, v_title, p_lead, NULLIF(st.action_config->>'userId','')::uuid, v_when, 'todo');
        v_actions := v_actions + 1;

      ELSIF st.action_type IN ('send_whatsapp','send_email') THEN
        v_msg := COALESCE(st.action_config->>'message','');
        v_msg := replace(v_msg, '{nome}', COALESCE(v_lead_name,''));
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

-- Gatilho: novo lead → 'lead_created'
CREATE OR REPLACE FUNCTION public.tg_flows_lead_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF; -- evita recursão
  PERFORM public.run_automation_flows('lead_created', NEW.company_id, NEW.id, NEW.stage);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_flows_lead_created ON public.leads;
CREATE TRIGGER trg_flows_lead_created AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_flows_lead_created();

-- Gatilho: mudou etapa → 'stage_changed'
CREATE OR REPLACE FUNCTION public.tg_flows_stage_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF; -- evita cascata/loop
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    PERFORM public.run_automation_flows('stage_changed', NEW.company_id, NEW.id, NEW.stage);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_flows_stage_changed ON public.leads;
CREATE TRIGGER trg_flows_stage_changed AFTER UPDATE OF stage ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_flows_stage_changed();

-- Fluxos-modelo (inativos por padrão = 'rascunho') para as companies existentes.
DO $$
DECLARE c record; fid uuid;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    IF NOT EXISTS (SELECT 1 FROM public.automation_flows WHERE company_id=c.id AND name='Boas-vindas (novo lead)') THEN
      INSERT INTO public.automation_flows (company_id,name,trigger_type,trigger_config,status)
        VALUES (c.id,'Boas-vindas (novo lead)','lead_created','{}'::jsonb,'rascunho') RETURNING id INTO fid;
      INSERT INTO public.automation_flow_steps (flow_id,company_id,order_index,delay_minutes,action_type,action_config) VALUES
        (fid,c.id,0,0,'create_task','{"title":"Qualificar novo lead em 15 min"}'::jsonb),
        (fid,c.id,1,0,'send_whatsapp','{"message":"Olá {nome}! Obrigado pelo interesse 💚 Em instantes um especialista vai te atender."}'::jsonb);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.automation_flows WHERE company_id=c.id AND name='Reativação de lead frio') THEN
      INSERT INTO public.automation_flows (company_id,name,trigger_type,trigger_config,status)
        VALUES (c.id,'Reativação de lead frio','stage_changed','{"stage":"lead_frio"}'::jsonb,'rascunho') RETURNING id INTO fid;
      INSERT INTO public.automation_flow_steps (flow_id,company_id,order_index,delay_minutes,action_type,action_config) VALUES
        (fid,c.id,0,0,'send_whatsapp','{"message":"Oi {nome}! Sentimos sua falta 💚 Quer retomar de onde paramos? Tenho uma condição especial pra você."}'::jsonb),
        (fid,c.id,1,1440,'create_task','{"title":"Reativar lead frio — ligar"}'::jsonb);
    END IF;
  END LOOP;
END $$;
