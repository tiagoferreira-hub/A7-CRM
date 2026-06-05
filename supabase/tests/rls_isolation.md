# Teste de isolamento RLS (FASE 0.2) — rodar com banco ao vivo

> Não é executável só com a anon key. Rode depois de ter o backup + acesso ao banco
> (ver `PROGRESS.md`). Pode ser colado no **SQL Editor** do Supabase ou via `psql`.

## O que prova
Usuário da Company A **não** consegue ler/alterar dados (leads etc.) da Company B,
e o **seller** não consegue editar configurações sensíveis (flows/scripts/playbooks).

## Roteiro (resumo)

1. Criar 2 companies (A e B) e 1 usuário em cada (via Auth → signup ou painel).
2. Inserir 1 lead em cada company.
3. Autenticar como usuário de A (com o JWT dele) e rodar:
   ```sql
   -- Esperado: retorna SOMENTE leads da company A
   select id, company_id, name from public.leads;
   ```
   O lead da company B NÃO deve aparecer. Tentar atualizar um lead de B deve afetar 0 linhas.
4. Como **seller** da company A, tentar:
   ```sql
   insert into public.scripts (company_id, name, stage) values (current_company_id(), 'x', 'lead_entrou');
   -- Esperado: erro de RLS (new row violates row-level security policy)
   ```
5. Como **admin/client** da company A, o mesmo insert deve funcionar.

## Verificação rápida das funções
```sql
select public.current_company_id();  -- company do usuário logado
select public.current_role();         -- owner|admin|client|seller
```

## Automação futura
Quando houver um ambiente de testes com service_role, dá para escrever este teste em
TypeScript (vitest) criando 2 clientes Supabase autenticados e checando os SELECTs.
Hoje fica como roteiro manual porque depende de credenciais que não estão no repo.
