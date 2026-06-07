import React, { useState } from "react";

// Página PÚBLICA (sem login): o lead indicado se cadastra pelo link ?/indique/<ref>.
// Lê o "ref" (id do indicador) do caminho e chama a Edge Function capture-lead.
const getRef = (): string => {
  const m = window.location.pathname.match(/\/indique\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : "";
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Capture: React.FC = () => {
  const ref = getRef();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/capture-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: PUBLISHABLE,
          Authorization: `Bearer ${PUBLISHABLE}`,
        },
        body: JSON.stringify({ ref, name: name.trim(), phone: phone.trim(), channel: "whatsapp" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setStatus("ok");
      else { setStatus("error"); setError(data.error || "Falha ao enviar."); }
    } catch {
      setStatus("error");
      setError("Sem conexão. Tente novamente.");
    }
  };

  const inputCls = "w-full text-base border border-input rounded-lg px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-xl font-bold mb-3">A7</div>
          <h1 className="text-xl font-bold text-foreground">Você foi indicado(a)! 🎁</h1>
          <p className="text-sm text-muted-foreground mt-1">Deixe seu contato que entramos em contato com você.</p>
        </div>

        {status === "ok" ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-2xl mb-2">✅</p>
            <h2 className="text-base font-semibold text-foreground">Recebido, obrigado!</h2>
            <p className="text-sm text-muted-foreground mt-1">Em breve entraremos em contato. 💚</p>
          </div>
        ) : !ref ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Link de indicação inválido.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Seu nome</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" required />
            </div>
            {error && <p className="text-xs text-destructive">{error === "invalid_ref" ? "Link de indicação inválido." : error}</p>}
            <button type="submit" disabled={status === "loading"} className="w-full text-base font-semibold px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {status === "loading" ? "Enviando..." : "Quero ser contatado(a)"}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-4">Seus dados são tratados com segurança.</p>
      </div>
    </div>
  );
};

export default Capture;
