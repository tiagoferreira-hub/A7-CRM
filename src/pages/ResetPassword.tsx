import React, { useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { MIN_PASSWORD_LENGTH, recoveryLinkError, setNewPassword, validateNewPassword } from "@/lib/passwordRecovery";

type Phase = "checking" | "invalid" | "ready" | "saving" | "done";

const inputClass =
  "w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring";

/**
 * Tela aberta pelo link do e-mail de recuperação (RECOVERY_PATH).
 * O supabase-js já transformou o link numa sessão; aqui só se troca a senha.
 * `onDone` existe para teste — no site, recarrega na raiz já logado.
 */
const ResetPassword: React.FC<{ onDone?: () => void }> = ({
  onDone = () => window.location.replace("/"),
}) => {
  const [phase, setPhase] = useState<Phase>("checking");
  const [problem, setProblem] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    // Link vencido/usado: o Supabase devolve o motivo no próprio endereço.
    const linkError = recoveryLinkError(window.location.hash, window.location.search);
    if (linkError) {
      setProblem(linkError);
      setPhase("invalid");
      return;
    }
    // getSession espera o supabase-js terminar de ler o token do link.
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) setPhase("ready");
      else {
        setProblem("Este link de recuperação não é válido. Peça um novo na tela de login.");
        setPhase("invalid");
      }
    });
    return () => { alive = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateNewPassword(password, confirm);
    if (invalid) { setError(invalid); return; }
    setError("");
    setPhase("saving");
    const failure = await setNewPassword(password);
    if (failure) {
      setError(failure);
      setPhase("ready");
      return;
    }
    setPhase("done");
    setTimeout(onDone, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size={56} />
          <h1 className="text-2xl font-bold text-foreground tracking-tight mt-4">CRM A7</h1>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          {phase === "checking" && <p className="text-sm text-muted-foreground text-center">Verificando o link…</p>}

          {phase === "invalid" && (
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Link inválido</h2>
              <p className="text-sm text-muted-foreground">{problem}</p>
              <a href="/login" className="inline-block text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                Ir para o login
              </a>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-crm-success" />
              <h2 className="text-lg font-semibold text-foreground">Senha alterada!</h2>
              <p className="text-sm text-muted-foreground">Entrando no sistema…</p>
            </div>
          )}

          {(phase === "ready" || phase === "saving") && (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" /> Criar nova senha
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Mínimo de {MIN_PASSWORD_LENGTH} caracteres.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="nova-senha" className="text-xs font-medium text-muted-foreground">Nova senha</label>
                  <input id="nova-senha" type="password" autoComplete="new-password" className={inputClass}
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="confirmar-senha" className="text-xs font-medium text-muted-foreground">Repita a nova senha</label>
                  <input id="confirmar-senha" type="password" autoComplete="new-password" className={inputClass}
                    value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
                {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={phase === "saving"}
                  className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {phase === "saving" ? "Salvando…" : "Salvar nova senha"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
