-- FASE 0.2 — Fundação de segurança (RLS)
-- O RLS já está habilitado em todas as tabelas multi-tenant (ver migrations anteriores).
-- Aqui adicionamos:
--   1) funções current_company_id() / current_role() pedidas no brief;
--   2) restrição: VENDEDOR (seller) não edita configurações sensíveis (regras/fluxos/scripts).

-- 1) Helpers de contexto do usuário logado -----------------------------------

-- Empresa (tenant) do usuário atual, a partir do profile/JWT.
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_company_id(auth.uid())
$$;

-- Papel do usuário atual (owner|admin|client|seller).
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 2) Restrição de seller em tabelas de configuração sensível -------------------
-- Estratégia: recriar APENAS as policies de escrita (insert/update/delete) adicionando
-- "current_role() <> 'seller'". As policies de SELECT continuam: o vendedor pode VER as
-- regras/fluxos/scripts, mas não pode criar/editar/excluir. O owner já tem policy própria
-- "Owner all ..." que não é afetada (owner nunca é seller).

-- automation_flows
DROP POLICY IF EXISTS "Company users insert flows" ON public.automation_flows;
DROP POLICY IF EXISTS "Company users update flows" ON public.automation_flows;
DROP POLICY IF EXISTS "Company users delete flows" ON public.automation_flows;
CREATE POLICY "Company users insert flows" ON public.automation_flows
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users update flows" ON public.automation_flows
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users delete flows" ON public.automation_flows
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');

-- automation_flow_steps
DROP POLICY IF EXISTS "Company users insert flow steps" ON public.automation_flow_steps;
DROP POLICY IF EXISTS "Company users update flow steps" ON public.automation_flow_steps;
DROP POLICY IF EXISTS "Company users delete flow steps" ON public.automation_flow_steps;
CREATE POLICY "Company users insert flow steps" ON public.automation_flow_steps
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users update flow steps" ON public.automation_flow_steps
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users delete flow steps" ON public.automation_flow_steps
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');

-- scripts
DROP POLICY IF EXISTS "Company users insert scripts" ON public.scripts;
DROP POLICY IF EXISTS "Company users update scripts" ON public.scripts;
DROP POLICY IF EXISTS "Company users delete scripts" ON public.scripts;
CREATE POLICY "Company users insert scripts" ON public.scripts
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users update scripts" ON public.scripts
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users delete scripts" ON public.scripts
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');

-- playbooks
DROP POLICY IF EXISTS "Company users insert playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Company users update playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Company users delete playbooks" ON public.playbooks;
CREATE POLICY "Company users insert playbooks" ON public.playbooks
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users update playbooks" ON public.playbooks
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');
CREATE POLICY "Company users delete playbooks" ON public.playbooks
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.current_role() <> 'seller');

-- TESTE DE ISOLAMENTO (critério de aceite 0.2): provar que usuário da company A não lê
-- dados da company B exige um banco ao vivo (criar 2 companies + 2 usuários e consultar
-- com cada JWT). Não é executável só com a anon key. Roteiro do teste documentado em
-- supabase/tests/rls_isolation.md para rodar assim que o backup/credenciais existirem.
