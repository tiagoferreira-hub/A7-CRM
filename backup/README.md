# backup/

Pasta reservada para o **dump do banco** (schema + dados) antes de aplicar migrations.

Está vazia porque o backup ainda **não foi feito**: o repositório só tem a chave pública
do Supabase (anon key), que não permite dump. Ver `PROGRESS.md` → "AÇÃO NECESSÁRIA DO DONO".

Quando houver credencial, o arquivo de backup será gravado aqui como
`pre_build_AAAAMMDD.sql` e **nenhuma migration deve ser aplicada antes disso**.
