# A7 CRM — Roadmap & Estado do Projeto (fonte da verdade)

> Documento durável (sobrevive a /compact e a novas sessões). Atualizar conforme avançamos.
> Última atualização: jun/2026.

## 1. Visão de negócio
CRM **multi-tenant** para **saúde & bem-estar** (clínicas/médicos/consultórios), com visão de
**plataforma/agência**: reaplicar o mesmo sistema em outros nichos no futuro (advogados,
hotelaria, gestores de investimento…). Owner (Tiago/Asset) onboarda clientes; cada cliente = `company`.
Toda feature deve nascer **genérica** + permitir **preset por nicho** depois.

## 2. Stack & acessos
- Local: `C:\projetos\A7-CRM` · React + Vite + TS + Tailwind/shadcn · Supabase JS.
- Banco: **Supabase próprio** do usuário, ref `xydhsjngwwsyqehpdhcf` (URL `https://xydhsjngwwsyqehpdhcf.supabase.co`).
- Hospedagem: **Vercel**, produção `a7-crm-ashy.vercel.app` (deploy automático ao mergear na `main`).
- Login owner: o próprio usuário (Tiago).
- **Segredos** (não gravados aqui por segurança): senha do banco (connection string do Session Pooler,
  host `aws-1-sa-east-1.pooler.supabase.com:5432`, user `postgres.xydhsjngwwsyqehpdhcf`) e
  **Supabase Access Token** (`sbp_...`). Foram passados no chat; reenviar se a sessão perder.

## 3. Convenções de trabalho
- Cada feature: migration (`npx supabase db push --db-url ...` no Supabase do usuário) → backend →
  frontend → `npm test` + `npm run build` → **branch** → **PR**.
- **O assistente NÃO pode mergear na `main`** (trava de segurança) nem rodar migrations/escritas
  diretas via classifier — o **usuário faz o merge** (Create PR → Merge → Confirm) e clica passos
  privilegiados. `supabase db push` (migrations) e `functions deploy` são permitidos ao assistente.
- Migrations já aplicadas no banco mesmo antes do merge (são aditivas; o código só usa após merge).

## 4. Concluído e MERGEADO
- **Fase 0**: RLS + `current_company_id()`/`current_role()` + `lifecycle_events` (histórico de etapas).
- **Fase 1**: palavra-chave→etapa (`keyword_rules`) + origem/UTM do lead (canais, badges, filtro).
- **Agenda (Fase 2)**: visão semana/dia, arrastar p/ reagendar, modal, status→funil, `duration_minutes`.
- **Conversão**: relatório (win rate, ticket, conversão por origem/canal/vendedor, motivos de perda).
- **Catálogo de Procedimentos (B1)** — aba "Procedimentos": custo, tempo, plano recorrente+recall,
  indicações/contra-indicações, info, e **cronograma pós-procedimento**.
- **Pós-op automático (B2+D1)**: agendamento↔procedimento; ao marcar "compareceu", gera follow-ups
  pós-op personalizados ({nome}/{procedimento}) nas datas certas (gatilho no banco, sem cron).
- **Indicações v1**: aba Indicações (ranking de indicadores), `referred_by_lead_id`, "Indicado por" no novo lead.

## 5. PRs ABERTOS (faltam mergear)
- **`feat/time-based-reminders`** — Lembretes por TEMPO **C2+D3** (cron). Migration
  `20260606170000`: função `run_time_based_reminders()` (recall de planos recorrentes +
  "sem resposta há X dias" → cria follow-ups), wrapper seguro `request_my_reminders()`,
  tabela `automation_settings` (liga/desliga + limiares), agendador `pg_cron` (job
  `a7-daily-reminders`, 12:00 UTC, com fallback). Edge Function `run-reminders` (publicada,
  agendador externo, segredo opcional `REMINDERS_CRON_SECRET`). UI: card "Lembretes
  automáticos" no topo da aba Follow-ups (Automações) com botão "Rodar agora".
  Utils `src/lib/reminders.ts` + testes. **Migration já aplicada no banco; falta MERGEAR.**

> JÁ MERGEADOS por #7/#8: `feat/referral-public-capture` (Indicação v2 — Edge `capture-lead`
> + página `/indique/<ref>`) e `feat/automation-engine` (motor C1 por evento). Ver seção 4.

## 6. Dados de demonstração
Company **"Clínica Bella Pelle (Demo)"** (Painel do Proprietário → Acessar CRM): 5 procedimentos com
pós-op (Botox, Preench. Labial, Limpeza, Skinbooster, Olheiras), ~9 pacientes no funil, 3 agendamentos,
2 indicações. Criada via seed (script removido após uso).

## 7. PRÓXIMOS PASSOS (em ordem)
1. ✅ **C2 / D3 — lembretes por tempo (cron)** — FEITO (branch `feat/time-based-reminders`, falta mergear).
2. **D2 — reativação personalizada pelo procedimento de interesse** (mensagens por produto/serviço do lead).
3. **E — metas/comissão por vendedor + lead scoring**.
4. **DESIGN — repaginação**: ⚠️ feedback do dono — **margens ruins / pouco prático**. Carta branca para
   redesenhar (densidade, margens, praticidade, responsividade). Depois: **guia + pop-ups de navegação**.
5. Mais à frente: Playbooks/Scripts (Fase 4), Inbox WhatsApp/IG (Fase 5, depende Meta), IA (Fase 6),
   configurabilidade por nicho (multi-vertical).

## 8. Notas técnicas úteis
- Etapas do funil (reais): `lead_entrou, hot_lead, agendado, compareceu, fechou, lead_frio, perdido`
  (labels em `src/types/lead.ts`). Mudança de etapa centralizada em `LeadsContext.moveLead(..., {trigger})`.
- Tabelas-chave novas: `lifecycle_events, keyword_rules, procedures, procedure_followups, workflow_runs`;
  colunas novas em `leads` (UTM, `referred_by_lead_id`) e `appointments` (`duration_minutes, procedure_id`).
- Utils puros testados: `keywordMatcher, leadCapture, conversion, referral, calendar, postop`.
