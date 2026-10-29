// "Esqueci minha senha": regras, tela de login, tela de nova senha e a trava de
// rota (quem chega pelo link NÃO pode cair dentro do sistema sem trocar a senha).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// vi.hoisted: o vi.mock abaixo sobe para o topo do arquivo e precisa deste objeto pronto.
const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));

// Usuário JÁ logado (a sessão de recuperação faz isso) — é o cenário perigoso.
vi.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: "u1", email: "dono@x.com" }, role: "owner", loading: false, viewAsCompany: null,
    signIn: vi.fn(), signUp: vi.fn(),
  }),
}));
vi.mock("@/pages/OwnerPanel", () => ({ default: () => <div>painel do proprietario</div> }));

import {
  RECOVERY_PATH, recoveryLinkError, recoveryRedirectUrl, requestPasswordReset,
  setNewPassword, validateNewPassword,
} from "@/lib/passwordRecovery";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import App from "@/App";

beforeEach(() => {
  Object.values(auth).forEach(fn => (fn as ReturnType<typeof vi.fn>).mockReset?.());
  auth.onAuthStateChange.mockImplementation(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
  window.history.replaceState({}, "", "/");
});
afterEach(cleanup);

// ── Regras ──────────────────────────────────────────────────────────────────
describe("regras", () => {
  it("o link do e-mail volta para /redefinir-senha do próprio site", () => {
    expect(recoveryRedirectUrl("https://a7-crm-ashy.vercel.app")).toBe("https://a7-crm-ashy.vercel.app/redefinir-senha");
    expect(recoveryRedirectUrl("https://a7-crm-ashy.vercel.app/")).toBe("https://a7-crm-ashy.vercel.app/redefinir-senha");
  });

  it("entende o erro de link vencido que o Supabase põe no endereço", () => {
    expect(recoveryLinkError("#error=access_denied&error_code=otp_expired&error_description=x")).toMatch(/expirou/);
    expect(recoveryLinkError("", "?error=server_error")).toMatch(/não é válido/);
    expect(recoveryLinkError("#access_token=abc&type=recovery")).toBeNull();
    expect(recoveryLinkError("")).toBeNull();
  });

  it("senha nova: mínimo de 8 caracteres e as duas iguais", () => {
    expect(validateNewPassword("1234567", "1234567")).toMatch(/8 caracteres/);
    expect(validateNewPassword("12345678", "12345679")).toMatch(/não são iguais/);
    expect(validateNewPassword("12345678", "12345678")).toBeNull();
  });

  it("pedido de link: enviado, limite de envios ou falha", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    expect(await requestPasswordReset("  a@b.com ", "https://site.com")).toBe("sent");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.com", { redirectTo: "https://site.com/redefinir-senha" });

    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: "email rate limit exceeded", status: 429 } });
    expect(await requestPasswordReset("a@b.com", "https://site.com")).toBe("rate_limited");

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: "Email address not authorized", status: 400 } });
    expect(await requestPasswordReset("a@b.com", "https://site.com")).toBe("failed");
    spy.mockRestore();
  });

  it("erros ao salvar a senha viram mensagens em português", async () => {
    auth.updateUser.mockResolvedValueOnce({ error: null });
    expect(await setNewPassword("novaSenha1")).toBeNull();
    auth.updateUser.mockResolvedValueOnce({ error: { message: "New password should be different from the old password." } });
    expect(await setNewPassword("novaSenha1")).toMatch(/diferente da anterior/);
  });
});

// ── Login ───────────────────────────────────────────────────────────────────
describe("tela de login", () => {
  const renderLogin = () => render(<MemoryRouter initialEntries={["/login"]}><Login /></MemoryRouter>);

  it("'Esqueci minha senha' pede o e-mail e envia o link para /redefinir-senha", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "dono@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar link/ }));
    await screen.findByRole("status");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("dono@x.com", {
      redirectTo: `${window.location.origin}${RECOVERY_PATH}`,
    });
  });

  it("a resposta não revela se a conta existe", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ninguem@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar link/ }));
    expect((await screen.findByRole("status")).textContent).toMatch(/Se este e-mail tiver uma conta/);
  });

  it("muitos pedidos seguidos: avisa para esperar", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "email rate limit exceeded", status: 429 } });
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "dono@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar link/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Espere alguns minutos/);
  });

  it("'Voltar para entrar' volta ao login; o link não aparece em 'Criar conta'", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar para entrar" }));
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar nova conta" }));
    expect(screen.queryByRole("button", { name: "Esqueci minha senha" })).not.toBeInTheDocument();
  });
});

// ── Tela de nova senha ──────────────────────────────────────────────────────
describe("tela de nova senha", () => {
  const fill = (a: string, b: string) => {
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: a } });
    fireEvent.change(screen.getByLabelText("Repita a nova senha"), { target: { value: b } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar nova senha/ }));
  };

  it("sem sessão de recuperação: link inválido, sem formulário", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    render(<ResetPassword onDone={vi.fn()} />);
    expect(await screen.findByText("Link inválido")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it("link vencido: explica e nem consulta a sessão", async () => {
    window.history.replaceState({}, "", `${RECOVERY_PATH}#error=access_denied&error_code=otp_expired`);
    render(<ResetPassword onDone={vi.fn()} />);
    expect(await screen.findByText(/expirou ou já foi usado/)).toBeInTheDocument();
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it("valida antes de enviar: curta ou diferente não chega ao Supabase", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<ResetPassword onDone={vi.fn()} />);
    await screen.findByLabelText("Nova senha");
    fill("curta", "curta");
    expect(screen.getByRole("alert").textContent).toMatch(/8 caracteres/);
    fill("senhaLonga1", "senhaLonga2");
    expect(screen.getByRole("alert").textContent).toMatch(/não são iguais/);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("senha válida: salva no Supabase e entra no sistema", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    auth.updateUser.mockResolvedValue({ error: null });
    const onDone = vi.fn();
    render(<ResetPassword onDone={onDone} />);
    await screen.findByLabelText("Nova senha");
    fill("senhaNova123", "senhaNova123");
    expect(await screen.findByText("Senha alterada!")).toBeInTheDocument();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "senhaNova123" });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 2500 });
  });
});

// ── Trava de rota ───────────────────────────────────────────────────────────
describe("trava de rota", () => {
  it("logado pela sessão de recuperação, /redefinir-senha mostra a troca de senha — não o sistema", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    window.history.replaceState({}, "", RECOVERY_PATH);
    render(<App />);
    expect(await screen.findByText("Criar nova senha")).toBeInTheDocument();
    expect(screen.queryByText("painel do proprietario")).not.toBeInTheDocument();
  });

  it("no endereço normal, o mesmo usuário vê o sistema", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    expect(screen.getByText("painel do proprietario")).toBeInTheDocument();
  });
});
