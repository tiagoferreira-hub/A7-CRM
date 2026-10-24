# Recuperar acesso do proprietário

Não é possível ver a senha atual: ela fica guardada de forma criptografada. Para recuperar o acesso de assetperformance.contato@gmail.com, vamos criar o fluxo "Esqueci minha senha".

## O que será feito
1. Adicionar o link "Esqueci minha senha" na tela de login.
2. Criar um formulário onde a pessoa informa o e-mail e recebe um link de recuperação.
3. Criar a página `/reset-password`, onde a pessoa define a nova senha ao abrir o link.
4. Depois de salvar, a pessoa entra no sistema com a nova senha.

## Detalhes técnicos
- `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`.
- A página `/reset-password` é pública, detecta `type=recovery` e chama `updateUser({ password })`.
- Ativar o login por e-mail, caso ainda não esteja ativo.
