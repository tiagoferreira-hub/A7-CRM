// "Esqueci minha senha" — regras e chamadas ao Supabase Auth.
//
// Fluxo (supabase-js 2.x, flowType padrão 'implicit'):
// 1. Login → requestPasswordReset(email): o Supabase manda um e-mail com link que
//    volta para RECOVERY_PATH.
// 2. Ao abrir o link, o supabase-js lê o token do endereço, JÁ FAZ O LOGIN e emite
//    PASSWORD_RECOVERY. Por isso RECOVERY_PATH é checado em App ANTES de qualquer
//    outra tela: senão a pessoa entraria no sistema sem trocar a senha.
// 3. Na tela de nova senha → setNewPassword(): updateUser({ password }).
//
// Pré-requisitos no painel do Supabase (fora do código):
// - Authentication → URL Configuration: Site URL e Redirect URLs com o domínio do
//   site (ex.: https://a7-crm-ashy.vercel.app/**).
// - O e-mail PADRÃO do Supabase só entrega para membros da equipe do projeto e
//   tem limite de ~2/hora. Para qualquer usuário: SMTP próprio (Authentication → SMTP).

import { supabase } from "@/integrations/supabase/client";

export const RECOVERY_PATH = "/redefinir-senha";
export const MIN_PASSWORD_LENGTH = 8;

/** Para onde o link do e-mail leva. Precisa estar nas Redirect URLs do Supabase. */
export const recoveryRedirectUrl = (origin: string) => `${origin.replace(/\/+$/, "")}${RECOVERY_PATH}`;

/**
 * Erro que o Supabase devolve no endereço quando o link não serve mais
 * (ex.: #error=access_denied&error_code=otp_expired&error_description=...).
 * Devolve uma mensagem em português, ou null se não houver erro.
 */
export function recoveryLinkError(hash: string, search = ""): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  new URLSearchParams(search.replace(/^\?/, "")).forEach((v, k) => { if (!params.has(k)) params.set(k, v); });
  if (!params.get("error") && !params.get("error_code")) return null;
  if (params.get("error_code") === "otp_expired") {
    return "Este link expirou ou já foi usado. Peça um novo na tela de login.";
  }
  return "Este link de recuperação não é válido. Peça um novo na tela de login.";
}

/** Valida a senha nova. Devolve a mensagem do problema, ou null se estiver ok. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password !== confirm) return "As duas senhas não são iguais.";
  return null;
}

export type ResetRequestResult = "sent" | "rate_limited" | "failed";

/**
 * Pede o e-mail de recuperação. "sent" não confirma que a conta existe — o
 * Supabase responde igual para e-mail cadastrado ou não, e a tela também deve,
 * para não revelar quem tem conta.
 */
export async function requestPasswordReset(email: string, origin = window.location.origin): Promise<ResetRequestResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: recoveryRedirectUrl(origin),
  });
  if (!error) return "sent";
  const status = (error as { status?: number }).status;
  if (status === 429 || /rate limit/i.test(error.message)) return "rate_limited";
  console.error("[recuperação de senha]", error.message);
  return "failed";
}

/** Grava a senha nova da sessão de recuperação. Devolve a mensagem de erro, ou null. */
export async function setNewPassword(password: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) return null;
  if (/different from the old|same password/i.test(error.message)) {
    return "A senha nova precisa ser diferente da anterior.";
  }
  if (/weak|short|characters/i.test(error.message)) {
    return "Essa senha é fraca demais. Use uma mais longa, misturando letras e números.";
  }
  console.error("[nova senha]", error.message);
  return "Não foi possível salvar a senha. Peça um novo link e tente de novo.";
}
