import React, { useMemo, useState } from "react";
import { useLeads } from "@/context/LeadsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useSalesTargets } from "@/hooks/useSalesTargets";
import { useAuth } from "@/context/AuthContext";
import { Target, TrendingUp, DollarSign, Award, Edit2, Check, X } from "lucide-react";
import { computeLeadScore, scoreLabel } from "@/lib/leadScore";

const fmtMoney = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ProgressBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const now = new Date();
const YEAR  = now.getFullYear();
const MONTH = now.getMonth() + 1;

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface EditState {
  userId: string;
  targetRevenue: string;
  targetLeads: string;
  commissionRate: string;
}

const MetasReport: React.FC = () => {
  const { leads } = useLeads();
  const members = useCompanyMembers();
  const { role } = useAuth();
  const [year, setYear]   = useState(YEAR);
  const [month, setMonth] = useState(MONTH);
  const { targets, upsertTarget } = useSalesTargets(year, month);
  const [editing, setEditing] = useState<EditState | null>(null);

  const canEdit = role === "owner" || role === "admin";

  // Leads fechados no período selecionado, por responsável
  const statsByUser = useMemo(() => {
    const result: Record<string, { closed: number; revenue: number }> = {};
    leads.forEach(l => {
      if (l.stage !== "fechou" || !l.assignedTo) return;
      const d = new Date(l.lastInteraction);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
      if (!result[l.assignedTo]) result[l.assignedTo] = { closed: 0, revenue: 0 };
      result[l.assignedTo].closed  += 1;
      result[l.assignedTo].revenue += l.value ?? 0;
    });
    return result;
  }, [leads, year, month]);

  // Lead scoring: top leads por score
  const topLeads = useMemo(() => {
    return [...leads]
      .filter(l => l.stage !== "fechou" && l.stage !== "perdido")
      .map(l => ({ lead: l, score: computeLeadScore(l) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [leads]);

  const targetByUser = useMemo(() =>
    Object.fromEntries(targets.map(t => [t.userId, t])),
    [targets]
  );

  // Union de todos os usuários com leads fechados OU com metas definidas
  const userIds = useMemo(() => {
    const s = new Set<string>([
      ...Object.keys(statsByUser),
      ...targets.map(t => t.userId),
    ]);
    return [...s];
  }, [statsByUser, targets]);

  const memberName = (id: string) =>
    members.find(m => m.userId === id)?.displayName ?? id.slice(0, 8);

  function startEdit(userId: string) {
    const t = targetByUser[userId];
    setEditing({
      userId,
      targetRevenue:  String(t?.targetRevenue  ?? 0),
      targetLeads:    String(t?.targetLeads    ?? 0),
      commissionRate: String(t?.commissionRate ?? 10),
    });
  }

  async function saveEdit() {
    if (!editing) return;
    await upsertTarget(editing.userId, {
      targetRevenue:  Number(editing.targetRevenue),
      targetLeads:    Number(editing.targetLeads),
      commissionRate: Number(editing.commissionRate),
    });
    setEditing(null);
  }

  // Totals
  const totals = useMemo(() => {
    let closed = 0, revenue = 0, commission = 0, tLeads = 0, tRevenue = 0;
    userIds.forEach(uid => {
      const s = statsByUser[uid] ?? { closed: 0, revenue: 0 };
      const t = targetByUser[uid];
      closed  += s.closed;
      revenue += s.revenue;
      commission += s.revenue * ((t?.commissionRate ?? 10) / 100);
      tLeads   += t?.targetLeads   ?? 0;
      tRevenue += t?.targetRevenue ?? 0;
    });
    return { closed, revenue, commission, tLeads, tRevenue };
  }, [userIds, statsByUser, targetByUser]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header + period picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Metas & Comissões</h3>
          <p className="text-sm text-muted-foreground">Performance por vendedor no período selecionado.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[YEAR - 1, YEAR, YEAR + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Target,    label: "Leads fechados", value: `${totals.closed}${totals.tLeads > 0 ? ` / ${totals.tLeads}` : ""}`,  color: "text-primary" },
          { icon: TrendingUp,label: "Receita",          value: fmtMoney(totals.revenue),  color: "text-emerald-600" },
          { icon: DollarSign,label: "Comissões",        value: fmtMoney(totals.commission), color: "text-amber-600" },
          { icon: Award,     label: "Meta receita",     value: totals.tRevenue > 0 ? fmtMoney(totals.tRevenue) : "—", color: "text-violet-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className={`flex items-center gap-2 mb-1 ${color}`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Per-rep table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Por vendedor</h4>
          {canEdit && (
            <p className="text-xs text-muted-foreground">Clique em ✏️ para definir meta do mês</p>
          )}
        </div>

        {userIds.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum lead fechado ou meta definida para {MONTH_NAMES[month - 1]}/{year}.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {userIds.map(uid => {
              const s = statsByUser[uid] ?? { closed: 0, revenue: 0 };
              const t = targetByUser[uid];
              const rate = t?.commissionRate ?? 10;
              const commission = s.revenue * (rate / 100);
              const isEditing = editing?.userId === uid;

              return (
                <div key={uid} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {memberName(uid).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{memberName(uid)}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.closed} fechado{s.closed !== 1 ? "s" : ""} · {fmtMoney(s.revenue)} · comissão: {fmtMoney(commission)} ({rate}%)
                        </p>
                      </div>
                    </div>

                    {canEdit && !isEditing && (
                      <button
                        onClick={() => startEdit(uid)}
                        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Editar meta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canEdit && isEditing && (
                      <div className="flex items-center gap-1">
                        <button onClick={saveEdit}   className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditing(null)} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {[
                        { label: "Meta de leads",   field: "targetLeads",    type: "number", placeholder: "0" },
                        { label: "Meta de receita (R$)", field: "targetRevenue", type: "number", placeholder: "0" },
                        { label: "Comissão (%)",    field: "commissionRate", type: "number", placeholder: "10" },
                      ].map(({ label, field, type, placeholder }) => (
                        <div key={field}>
                          <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                          <input
                            type={type}
                            min={0}
                            placeholder={placeholder}
                            value={(editing as Record<string, string>)[field]}
                            onChange={e => setEditing(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
                            className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress bars (mostrar só se houver meta) */}
                  {!isEditing && t && (t.targetLeads > 0 || t.targetRevenue > 0) && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {t.targetLeads > 0 && (
                        <div>
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                            <span>Leads</span>
                            <span>{s.closed} / {t.targetLeads}</span>
                          </div>
                          <ProgressBar
                            value={s.closed}
                            max={t.targetLeads}
                            color={s.closed >= t.targetLeads ? "bg-emerald-500" : "bg-primary"}
                          />
                        </div>
                      )}
                      {t.targetRevenue > 0 && (
                        <div>
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                            <span>Receita</span>
                            <span>{fmtMoney(s.revenue)} / {fmtMoney(t.targetRevenue)}</span>
                          </div>
                          <ProgressBar
                            value={s.revenue}
                            max={t.targetRevenue}
                            color={s.revenue >= t.targetRevenue ? "bg-emerald-500" : "bg-amber-500"}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lead Scoring */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Lead Score — Top oportunidades</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Leads ativos ordenados por potencial de conversão.</p>
        </div>
        <div className="divide-y divide-border">
          {topLeads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum lead ativo.</p>
          ) : topLeads.map(({ lead, score }) => {
            const sl = scoreLabel(score);
            return (
              <div key={lead.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.service} · {lead.stage.replace("_", " ")}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sl.color}`}>
                  {sl.label} {score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default MetasReport;
