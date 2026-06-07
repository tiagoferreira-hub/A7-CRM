// C2 + D3 — Painel "Lembretes automáticos": liga/desliga, ajusta limiares e roda na hora.
// Os lembretes criados caem na própria fila de follow-ups (abaixo, nesta mesma aba).
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollowUps } from "@/context/FollowUpsContext";
import { toast } from "sonner";
import { Clock, RefreshCw, Repeat, BellOff } from "lucide-react";

interface Settings {
  reminders_enabled: boolean;
  no_reply_days: number;
  recall_lead_window_days: number;
}

const RemindersCard: React.FC = () => {
  const { activeCompanyId, role } = useAuth();
  const { reload } = useFollowUps();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const canEdit = role !== "seller";

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    const { data } = await (supabase as any)
      .from("automation_settings").select("*").eq("company_id", activeCompanyId).maybeSingle();
    setS(data ?? { reminders_enabled: true, no_reply_days: 3, recall_lead_window_days: 14 });
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (patch: Partial<Settings>) => {
    if (!activeCompanyId || !s) return;
    const next = { ...s, ...patch };
    setS(next);
    setSaving(true);
    await (supabase as any).from("automation_settings")
      .upsert({ company_id: activeCompanyId, ...next, updated_at: new Date().toISOString() });
    setSaving(false);
  }, [activeCompanyId, s]);

  const runNow = useCallback(async () => {
    setRunning(true);
    const { data, error } = await (supabase as any).rpc("request_my_reminders");
    setRunning(false);
    if (error) { toast.error("Não foi possível rodar os lembretes."); return; }
    const n = data ?? 0;
    toast.success(n > 0 ? `${n} lembrete(s) criado(s) na fila.` : "Nenhum lembrete novo agora. 👍");
    if (n > 0) reload();
  }, [reload]);

  if (!s) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Lembretes automáticos</h3>
            <p className="text-xs text-muted-foreground">
              Recall de planos recorrentes e leads parados viram follow-ups todo dia.
            </p>
          </div>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} /> Rodar agora
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <label className="flex items-center gap-2 text-sm rounded-lg border p-2.5">
          <input
            type="checkbox"
            checked={s.reminders_enabled}
            disabled={!canEdit || saving}
            onChange={(e) => save({ reminders_enabled: e.target.checked })}
          />
          <span className="flex items-center gap-1.5">
            {s.reminders_enabled ? <Repeat className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            {s.reminders_enabled ? "Ativado" : "Desativado"}
          </span>
        </label>

        <label className="text-xs text-muted-foreground rounded-lg border p-2.5">
          Sem resposta há (dias)
          <input
            type="number" min={1} max={60}
            value={s.no_reply_days}
            disabled={!canEdit || saving}
            onChange={(e) => save({ no_reply_days: Math.max(1, Number(e.target.value) || 1) })}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
          />
        </label>

        <label className="text-xs text-muted-foreground rounded-lg border p-2.5">
          Avisar recall com (dias) de antecedência
          <input
            type="number" min={0} max={90}
            value={s.recall_lead_window_days}
            disabled={!canEdit || saving}
            onChange={(e) => save({ recall_lead_window_days: Math.max(0, Number(e.target.value) || 0) })}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
          />
        </label>
      </div>
    </div>
  );
};

export default RemindersCard;
