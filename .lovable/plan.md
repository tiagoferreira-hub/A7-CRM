## Objetivo

Adicionar a aba **Automações** (follow-ups + estrutura para disparos/workflows futuros) e evoluir o **Pipeline** com responsável, motivo de perda, tags, histórico e filtros — mantendo isolamento multiempresa, design atual e arquitetura existente.

---

## 1. Banco de dados (migration única)

Novas tabelas (todas com `company_id`, RLS por `get_user_company_id` + bypass para `owner`, padrão das demais):

- **follow_ups**
  - `lead_id`, `assigned_to`, `scheduled_at` (date+time), `notes`, `status` (`pendente|concluido|atrasado`), `completed_at`, `created_by`
- **campaigns** (estrutura para disparos futuros)
  - `name`, `channel` (`whatsapp|email`), `status` (`agendado|pausado|ativo|concluido`), `scheduled_at`, `sent_count` (default 0), `replied_count` (default 0), `payload jsonb`
- **lead_tags**
  - `name`, `color`, único por (`company_id`, `name`)
- **lead_tag_assignments**
  - `lead_id`, `tag_id`, único por par
- **lead_history** (timeline)
  - `lead_id`, `event_type` (`created|stage_changed|assignee_changed|followup_created|followup_completed|lost_reason|appointment_created|message`), `actor_id`, `payload jsonb`

Alterações em `leads`:
- `loss_reason text` nullable
- (já existe `assigned_to`)

Triggers:
- `leads`: ao INSERT registra `created`; ao UPDATE de `stage` registra `stage_changed` (incluindo `loss_reason` no payload se `perdido`); ao UPDATE de `assigned_to` registra `assignee_changed`.
- `appointments`: registra `appointment_created`.
- `follow_ups`: registra `followup_created` / `followup_completed`; ao SELECT/aplicação marcamos `atrasado` no client (sem cron — apenas derivado).

---

## 2. Frontend — Automações

Novo arquivo `src/pages/Automations.tsx` + `src/context/FollowUpsContext.tsx` + `src/context/CampaignsContext.tsx` (esqueleto, listar/criar/pausar).

UI (mantendo estilo minimalista atual):
- Sub-abas internas: **Follow-ups** | **Disparos** (com selo "em breve" para campos não-operacionais).
- Follow-ups: três seções (Hoje, Próximos, Atrasados) com botão "Concluir" inline e modal "Novo follow-up" (lead, data, hora, obs, responsável).
- Disparos: lista simples com status, contadores e ação pausar/ativar.

Adicionar item **Automações** no menu em `src/pages/Index.tsx` (ícone `Zap`).

Pontos de integração:
- `LeadDetailModal`: botão "Novo follow-up".
- `Conversations` header: botão "Follow-up" ao lado dos atuais "Tarefa" e "Agendar".

---

## 3. Frontend — Pipeline

`KanbanBoard.tsx` / `LeadCard.tsx` / `LeadDetailModal.tsx`:

1. **Responsável**: select de membros da empresa (carregar via `profiles` filtrados por `company_id`); mostrar avatar/iniciais no `LeadCard`; editar no modal.
2. **Motivo de perda**: ao arrastar/mover para `perdido`, abrir `LossReasonModal` obrigatório (radios + "outro" com texto). Persistir em `leads.loss_reason` e disparar `lead_history`.
3. **Tags**: gerenciador inline no `LeadDetailModal` (criar/selecionar tags da empresa). Pills no card.
4. **Histórico**: nova seção no `LeadDetailModal` lendo `lead_history` em ordem cronológica.
5. **Filtros**: barra de filtros acima do board — responsável, origem, tags (multi), etapa (já é colunar, usado para destacar), follow-up pendente, sem responsável.
6. **Consistência**: reutilizar `LeadsContext` + novos hooks (`useFollowUps`, `useTags`, `useLeadHistory`), todos com `activeCompanyId`.

---

## 4. Providers

Em `src/App.tsx`, envolver com `FollowUpsProvider`, `CampaignsProvider`, `TagsProvider` dentro do bloco já existente do CRM.

---

## 5. Detalhes técnicos

- Status "atrasado" calculado no client quando `status='pendente' AND scheduled_at < now()` para evitar cron.
- Lista de membros da empresa: `select user_id, display_name from profiles where company_id = activeCompanyId`.
- Todas operações usam `.eq('company_id', activeCompanyId)` em update/delete (padrão dos contexts atuais).
- Sem nova lib; usar Dialog/Select/Badge existentes do shadcn.
- Sem alteração de tema/cores; ícones via `lucide-react`.

---

## Fora de escopo

- Envio real de WhatsApp/e-mail (apenas estrutura).
- Cron jobs / edge functions de disparo.
- Editor visual de workflows.
