# PROGRESS.md — A7 CRM (branch `feature/a7-fases-0-4`)

> Atualizado ao fim da sessão de construção. Tudo nesta branch; **nada na `main`**.
> Local do projeto: `C:\projetos\A7-CRM` (movido para ficar ao lado do `jf-disparos`).

## ✅ Resumo do que ficou pronto (commits incrementais)

| Fase | Entrega | Commit |
|------|---------|--------|
| -1   | branch + SCHEMA.md + PROGRESS.md + backup documentado | `docs: add SCHEMA.md ...` |
| 0.3  | tabela `lifecycle_events` + `moveLead` grava cada mudança de etapa | `feat: add lifecycle_events ...` |
| 0.2  | funções `current_company_id()`/`current_role()` + bloqueio de escrita do seller | `feat: add current_company_id ...` |
| 1.1  | `keyword_rules` + matcher testado + contexto + UI + aplicação no chat | `feat: keyword rules ...` |
| 1.2  | campos UTM em `leads` + parser testado + badge e filtro de canal | `feat: lead source/UTM ...` |

**Build/testes ao fim:** `npm run build` ✅ · `npm test` ✅ (19 testes) ·
`npm run lint` ❌ (112 erros **pré-existentes**, ver nota abaixo).

---

## ⚠️ AÇÃO NECESSÁRIA DO DONO — credenciais do banco (para aplicar no Supabase)

O `.env` só tem a **chave pública** (anon key). Com ela **não dá** para fazer backup nem
aplicar as migrations no banco real. As migrations já estão escritas como arquivos em
`supabase/migrations/` (seguras e reversíveis), mas **ainda não foram aplicadas no banco**.

Para aplicar (e antes disso, fazer o backup), preciso de **UMA** destas opções — me envie por
canal seguro, **não cole no chat nem em arquivo do repo**:

1. **Senha do banco** (Supabase → Project Settings → Database → "Database password"). Aí rodo:
   ```
   npx supabase db dump --db-url "postgresql://postgres:SENHA@db.bfacebuqwkpsaiyyuywm.supabase.co:5432/postgres" -f backup/pre_build_20260604.sql
   npx supabase db push   # aplica as migrations
   ```
2. **Access Token do CLI** (https://supabase.com/dashboard/account/tokens):
   `npx supabase login` → `npx supabase link --project-ref bfacebuqwkpsaiyyuywm` → dump + push.
3. **service_role key** (Project Settings → API).

Ordem segura: **1) backup → 2) aplicar migrations → 3) rodar o teste de isolamento RLS**
(`supabase/tests/rls_isolation.md`).

---

## Detalhe por fase

### FASE -1 — Setup de segurança
- [x] Branch `feature/a7-fases-0-4` (nada na `main`).
- [x] `SCHEMA.md` com o schema real (descoberto pelas migrations).
- [x] Projeto movido para `C:\projetos\A7-CRM`.
- [ ] **Backup do banco** — BLOQUEADO por falta de credencial. `backup/` tem só o README.

### FASE 0 — Fundação e segurança
- [x] **0.3 lifecycle_events**: tabela append-only com RLS. `LeadsContext.moveLead` virou a
      função única de mudança de etapa e grava o evento com `trigger_type`
      (`manual|keyword|workflow|agenda|ai`). Migration: `20260604120000_lifecycle_events.sql`.
- [x] **0.2 RLS**: RLS já existia em todas as tabelas. Adicionadas as funções
      `current_company_id()` e `current_role()`, e o **seller** perdeu permissão de escrita em
      `automation_flows`, `automation_flow_steps`, `scripts`, `playbooks` e `keyword_rules`
      (continua podendo ler). Migration: `20260604121000_rls_helpers_and_seller_restriction.sql`.
  - Teste de isolamento (usuário A não lê dados de B): exige banco ao vivo →
    roteiro pronto em `supabase/tests/rls_isolation.md` (rodar após backup).

### FASE 1 — Ganhos rápidos
- [x] **1.1 Palavra-chave → lifecycle**: `keyword_rules` (com seed de exemplos para as companies
      existentes). Núcleo puro em `src/lib/keywordMatcher.ts` (12 testes): `contains/exact/regex`,
      sem acento/caixa, ordem por prioridade, e **não retrocede no funil** por padrão. Aplicado em
      `ConversationsContext.sendMessage` (mensagem recebida ou enviada). UI de CRUD em
      **Configurações → Regras de palavra-chave**. Migration: `20260604122000_keyword_rules.sql`.
  - **Critério de aceite atendido** (na lógica/teste): escrever "agendamento marcado" numa conversa
    move o lead para *Agendado* e registra em `lifecycle_events`. Validação ponta-a-ponta na tela
    depende do banco com as migrations aplicadas.
- [x] **1.2 Origem do lead**: colunas `source, utm_source, utm_medium, utm_campaign, utm_content,
      utm_term, ad_id, referrer` em `leads`; canal ampliado (whatsapp, instagram, messenger, tiktok,
      site, indicação, ads, manual). Parser testado em `src/lib/leadCapture.ts` (6 testes). **Badge de
      canal** no card e **filtro por canal** no funil. Migration: `20260604123000_lead_source_utm.sql`.

---

## Nota sobre o `lint`
O `npm run lint` já vinha com **112 erros antes de qualquer alteração** (na maioria
`@typescript-eslint/no-explicit-any` no código existente). Não estava no escopo desta sessão
corrigir os 112. Meus arquivos de **lógica e UI** estão limpos; os de **contexto** usam
`(supabase as any)` exatamente como todos os contextos já existentes (a `types.ts` gerada não
inclui as tabelas novas). Critério mantido: **build e testes verdes**, sem novos padrões fora do
que o projeto já usa.

---

## Próximos passos (em ordem)
1. **Você:** me enviar uma credencial do banco (seção "AÇÃO NECESSÁRIA"). Então: backup →
   `supabase db push` (aplica as 4 migrations) → rodar `rls_isolation.md`.
2. **FASE 2 (Agenda):** a tabela `appointments` já existe e há trigger `sync_lead_from_appointment`
   que muda a etapa direto no banco — esse caminho **não passa** por `lifecycle_events`. Próximo
   passo técnico: gravar o evento de `agenda` também (trigger no banco escrevendo em
   `lifecycle_events`), e refazer a UI (visão semana/dia, arrastar p/ reagendar, status → funil).
3. **FASE 1.2 (captação pública):** criar Edge Function `lead-capture` com service_role que recebe
   `?utm_...&channel=...`, valida a company e grava o lead (a RLS bloqueia insert anônimo). O parser
   `src/lib/leadCapture.ts` já está pronto para essa função usar.
4. Opcional: corrigir aos poucos os 112 erros de lint pré-existentes.
