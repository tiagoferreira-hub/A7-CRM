# PROGRESS.md — A7 CRM (branch `feature/a7-fases-0-4`)

> Atualizado durante a sessão de construção. Tudo nesta branch; nada na `main`.

## ⚠️ AÇÃO NECESSÁRIA DO DONO — credenciais do banco

O `.env` do repositório só traz a **chave pública** do Supabase (`VITE_SUPABASE_PUBLISHABLE_KEY`,
a "anon key"). Com ela **não dá** para fazer backup do banco nem aplicar migrations no banco real.

Para eu (ou você) fazer o backup e aplicar as migrations com segurança, preciso de **UMA** destas opções:

1. **Senha do banco (Postgres)** — Supabase → Project Settings → Database → "Database password".
   Com ela rodo: `npx supabase db dump --db-url "postgresql://postgres:SENHA@db.bfacebuqwkpsaiyyuywm.supabase.co:5432/postgres" -f backup/pre_build_20260604.sql`
2. **Access Token do Supabase CLI** — https://supabase.com/dashboard/account/tokens
   Com ele: `npx supabase login` → `npx supabase link --project-ref bfacebuqwkpsaiyyuywm` → `npx supabase db dump`.
3. **service_role key** — Project Settings → API → service_role (secreta).

> ❗ Por segurança, **NÃO** cole essas chaves aqui no arquivo nem no chat público. Me passe por canal
> seguro. Enquanto não tiver o backup, **nenhuma migration é aplicada no banco** — só ficam como
> arquivos no projeto (seguros e reversíveis).

---

## FASE -1 — Setup de segurança

- [x] Branch isolada `feature/a7-fases-0-4` criada (nada na `main`).
- [x] `SCHEMA.md` gerado a partir das migrations existentes.
- [ ] **Backup do banco** — BLOQUEADO: faltam credenciais (ver acima). `backup/` ainda vazio.
- [x] Estratégia definida: escrever migrations como arquivos versionados (não aplicar no banco
      até existir backup).

## Estado do build (baseline ao clonar)

- `npm run build` → ✅ passa.
- `npm test` (vitest) → ✅ passa.
- `npm run lint` → ❌ **já falhava antes de qualquer alteração** (112 erros pré-existentes,
  na maioria `@typescript-eslint/no-explicit-any` no código já existente). Não faz parte do
  escopo desta sessão corrigir os 112; meu critério é **não quebrar build/testes** e não
  adicionar erros novos além do padrão já usado no projeto.

## FASE 0 — Fundação e Segurança

- [ ] 0.2 RLS — funções `current_company_id()`/`current_role()` + restrição de seller (migration).
- [ ] 0.3 `lifecycle_events` + centralizar mudança de etapa em `moveLeadStage`.

## FASE 1 — Ganhos rápidos

- [ ] 1.1 Palavra-chave → muda lifecycle (`keyword_rules` + matcher + UI).
- [ ] 1.2 Origem do lead (campos UTM + badge/filtro de canal).

## FASE 2+ — não iniciadas nesta sessão.

---

## Próximo passo
Ver seção "AÇÃO NECESSÁRIA" no topo: me enviar as credenciais para backup + aplicação das
migrations. O código e as migrations já ficam prontos na branch.
