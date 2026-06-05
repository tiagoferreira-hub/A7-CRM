# SCHEMA.md — Mapa do banco Supabase (A7 CRM)

> Gerado a partir das migrations existentes em `supabase/migrations/` (não foi possível
> consultar o banco ao vivo — ver `PROGRESS.md`, FASE -1). Os nomes aqui são **reais**.
> Multi-tenant: quase toda tabela tem `company_id`. Datas em `timestamptz`.

## Enums / tipos

- `public.app_role`: `owner`, `client`, `admin`, `seller`.

## Modelo de papéis e tenant

- **Tenant** = `company_id` (UUID) presente em todas as tabelas de dados de cliente.
- **Papel** do usuário fica em `public.user_roles` (`user_id`, `role`, `company_id`).
- `public.profiles` espelha `company_id` do usuário (trigger `sync_profile_company_from_role`)
  e guarda `display_name`, `theme`.
- **Owner da plataforma** = usuário com `role = 'owner'`. As policies de owner usam
  `has_role(uid,'owner')` e enxergam **todas** as companies (Painel do Proprietário).
  A posse é modelada por `companies.owner_id` (FK p/ `auth.users`).

## Funções auxiliares (já existentes)

- `public.has_role(_user_id uuid, _role app_role) -> boolean` (SECURITY DEFINER, STABLE).
- `public.get_user_company_id(_user_id uuid) -> uuid` (lê `profiles.company_id`).
- `public.update_updated_at_column()` — trigger genérico de `updated_at`.
- `public.handle_new_user()` — cria company/profile/role no signup (via `invite_token`).
- `public.handle_new_message()` — atualiza conversa + lead ao inserir mensagem.
- `public.sync_lead_from_appointment()` — agendamento muda `leads.stage`.
- `public.record_lead_history()` — grava em `lead_history` em insert/update de `leads`.
- `compute_message_timing()` / `update_conversation_metrics()` — métricas de resposta.

## Tabelas

### companies
`id, name, owner_id(FK auth.users), status('active'|'inactive'), created_at, updated_at`. RLS on.

### user_roles
`id, user_id(FK auth.users), role(app_role), company_id(FK companies)`. UNIQUE(user_id, role). RLS on.

### profiles
`id, user_id(FK auth.users, unique), display_name, company_id(FK companies), theme('dark'), created_at, updated_at`. RLS on.

### invitations
`id, token(unique), created_by, used_by, used_at, expires_at(+7d), created_at`. RLS on (só owner).

### leads  ← tabela central do funil
`id, company_id, name, phone, origin('manual'), stage('lead_entrou'), service, services(text[]),
value(numeric), last_message, last_interaction, observations, created_at, updated_at,
assigned_to, channel('manual'), first_message, first_interaction_at, external_conversation_id,
loss_reason`. RLS on (company-scoped + owner).

> **Etapas reais (`stage`)** — definidas no frontend em `src/types/lead.ts`:
> `lead_entrou` → `hot_lead` → `agendado` → `compareceu` → `fechou` → `lead_frio` (+ `perdido`).
> Mapeamento com o brief: `novo_lead`=`lead_entrou`, `lead_quente`=`hot_lead`, demais iguais,
> `lead_frio`=`lead_frio`.

### services
`id, company_id, name, created_at`. RLS on.

### tasks
`id, company_id, title, lead_id, assigned_to, due_date, status('todo'), created_at, updated_at`. RLS on.

### documents
`id, company_id, title, doc_type('playbook'), content, status('draft'), closed_at, created_at, updated_at`. RLS on.

### conversations
`id, company_id, lead_id, channel('whatsapp'), external_id, assigned_to, last_message,
last_message_at, unread_count, awaiting_reply, is_unread, status('open'|'closed'), created_at, updated_at`. RLS on.

### messages
`id, conversation_id, company_id, direction('inbound'|'outbound'), body, sent_at, created_at,
sender_type('lead'|'agent'), response_time_minutes`. RLS on.

### appointments
`id, company_id, lead_id, assigned_to, scheduled_at, appointment_type('avaliacao'),
status('agendado'|'compareceu'|'remarcado'|...), notes, created_at, updated_at`. RLS on.

### follow_ups
`id, company_id, lead_id, assigned_to, created_by, scheduled_at, notes, status('pendente'|'concluido'), completed_at, created_at, updated_at`. RLS on.

### campaigns
`id, company_id, name, channel('whatsapp'), status('agendado'), scheduled_at, sent_count, replied_count, payload(jsonb), created_at, updated_at`. RLS on.

### lead_tags / lead_tag_assignments
- `lead_tags`: `id, company_id, name, color('#6366f1'), created_at`. UNIQUE(company_id,name).
- `lead_tag_assignments`: `id, company_id, lead_id, tag_id, created_at`. UNIQUE(lead_id,tag_id). RLS on.

### lead_history
`id, company_id, lead_id, event_type, actor_id, payload(jsonb), created_at`. RLS on.
Eventos: `created, stage_changed, lost_reason, assignee_changed, appointment_created, followup_*, conversation_*`.

### automation_flows / automation_flow_steps  (esqueleto — Fase 3)
- `automation_flows`: `id, company_id, name, trigger_type('no_reply_days'), trigger_config(jsonb), status('rascunho'), created_by, created_at, updated_at`.
- `automation_flow_steps`: `id, flow_id, company_id, order_index, delay_minutes, action_type('send_whatsapp'), action_config(jsonb), created_at`. RLS on.

### conversation_metrics
`id, company_id, conversation_id(unique), avg_agent_response_time, avg_lead_response_time, first_response_time, total_messages, created_at, updated_at`. RLS on.

### playbooks (Fase 4)
`id, company_id, title, description, view_mode('document'|'flow'), sections(jsonb), flow_nodes(jsonb), created_at, updated_at`. RLS on.

### scripts (Fase 4)
`id, company_id, name, stage, content, is_active(bool), created_at, updated_at`. RLS on.
UNIQUE parcial: **1 script ativo por stage por company** (`scripts_one_active_per_stage`).

### script_usage (Fase 4)
`id, company_id, script_id, conversation_id, lead_id, used_by, lead_stage_at_use, used_at, created_at`. RLS on.

## Observações para as novas fases

- **RLS já está habilitado em todas as tabelas** com policies por `company_id` + policy de owner.
  A FASE 0.2 vira: adicionar funções `current_company_id()`/`current_role()` (apelidos das
  existentes) e restringir o **seller** em tabelas de configuração.
- `leads` já tem `origin` e `channel` — FASE 1.2 só adiciona os campos UTM.
- Mudança de etapa já é centralizada no frontend em `LeadsContext.moveLead()` — ponto natural
  para gravar `lifecycle_events` (FASE 0.3).

## Tabelas NOVAS criadas nestas fases (migrations em `supabase/migrations/`)

- `lifecycle_events` (FASE 0.3)
- `keyword_rules` (FASE 1.1)
- colunas UTM em `leads` (FASE 1.2)
