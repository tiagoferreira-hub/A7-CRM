## Objetivo
Consolidar o módulo **Conversas** como inbox omnichannel central do CRM A7, inspirado no Respond.io. Sem reescrever — apenas evoluir.

## 1. Banco de dados (uma migração)

**Alterar `conversations`:**
- adicionar `awaiting_reply boolean default false`
- adicionar `is_unread boolean default false` (marcação manual, separada de `unread_count`)

**Alterar `leads.stage`** — manter chaves técnicas existentes, adicionar nova chave `hot_lead`:
- `lead_entrou` → "🆕 Novo Lead"
- `hot_lead` → "🔥 Hot Lead" (NOVO)
- `em_atendimento` → "💬 Em Atendimento"
- `qualificado` removido da UI (mantido no DB para retrocompatibilidade, oculto)
- `agendado` → "📅 Agendado"
- `compareceu` → "✅ Compareceu"
- `fechou` → "💰 Fechou"
- `perdido` → "❌ Perdido"
- `sem_resposta` mantido oculto/legado

**Nova tabela `automation_flows`** (estrutura para fluxos futuros, sem execução):
- `name`, `trigger_type` (no_reply_days, stage_changed, lead_created), `trigger_config jsonb`, `status` (rascunho|ativo|pausado), `created_by`

**Nova tabela `automation_flow_steps`:**
- `flow_id`, `order_index`, `delay_minutes`, `action_type` (send_whatsapp|send_email|create_task|change_stage|assign|notify), `action_config jsonb`

RLS por `company_id` em todas, igual padrão existente.

## 2. Tipos & contextos

**`src/types/lead.ts`** — adicionar `hot_lead` ao enum `LeadStage`, atualizar `STAGE_LABELS` com emojis, definir `STAGE_ORDER` visível.

**`src/context/ConversationsContext.tsx`** — adicionar:
- `awaitingReply`, `isUnread` nos tipos
- `setAwaitingReply(id, bool)`
- `markUnread(id, bool)`
- `assignConversation(id, userId)` (sincroniza `conversations.assigned_to` + `leads.assigned_to`)
- `changeStage(conversationId, leadId, newStage)` (atualiza lead, dispara trigger de history)

**Novo `src/context/AutomationFlowsContext.tsx`** — CRUD básico (skeleton, sem execução).

## 3. UI Conversas (`src/pages/Conversations.tsx`)

**Sidebar (lista):**
- Filtros chips: Todas | Não lidas | Minhas | Sem responsável | Aguardando | Follow-up pendente
- Filtro por etapa (select)
- Filtro por origem (select)
- Busca: nome OU telefone (normalizado)
- Card melhorado:
  - Avatar do lead (iniciais)
  - Nome + horário última interação (relativo: "2m", "1h", "ontem")
  - Última mensagem truncada
  - Badge etapa com emoji
  - Badge "🔴 Não lido" / "⏳ Aguardando" se aplicável
  - Mini-avatar do **responsável** no canto inferior direito (estilo Respond.io)

**Header da conversa aberta:**
- Nome + telefone do lead
- Select de **etapa** (com emojis) — altera direto
- Select de **responsável** (membros da empresa)
- Botões: "Aguardando resposta" (toggle), "Marcar não lido"
- Botões existentes: Follow-up, Tarefa, Agendar

**Painel direito (lateral, opcional, sem alterar layout principal):**
- Próximo follow-up + follow-ups atrasados
- Etapa atual + atalho

## 4. Follow-ups na conversa

- Botão "Follow-up" no header → modal com data/horário/observação/responsável
- Reusar `FollowUpsContext` existente
- Mostrar próximo follow-up no topo da conversa quando existir

## 5. Página Automações — aba "Fluxos"

Adicionar terceira sub-aba **Fluxos** em `src/pages/Automations.tsx`:
- Lista de fluxos criados
- Modal "Novo fluxo": nome + gatilho + steps (ações com delay)
- Sem execução real (placeholder: "Será disparado automaticamente em breve")

## 6. Consistência

- `addLead` já deduplica por telefone — manter
- `assignConversation` sincroniza lead.assigned_to
- `changeStage` via conversa atualiza lead, triggers de history já registram
- Tudo respeita `activeCompanyId` + role (seller vê só suas conversas)

## Arquivos

**Novos:**
- `supabase/migrations/<ts>_conversations_v2_and_flows.sql`
- `src/context/AutomationFlowsContext.tsx`
- `src/components/crm/ConversationListItem.tsx` (extrair card)
- `src/components/crm/ConversationHeader.tsx`

**Editados:**
- `src/types/lead.ts`, `src/types/automations.ts`
- `src/context/ConversationsContext.tsx`
- `src/pages/Conversations.tsx`
- `src/pages/Automations.tsx`
- `src/App.tsx` (provider)
- `src/integrations/supabase/types.ts` (regen automático)

## Fora de escopo
- Envio real de WhatsApp/email
- Execução do scheduler de fluxos
- Anexos/áudio/imagens (estrutura preparada apenas conceitualmente)