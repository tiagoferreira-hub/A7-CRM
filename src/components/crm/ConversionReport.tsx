import React, { useMemo, useState } from "react";
import { useLeads } from "@/context/LeadsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { ORIGIN_LABELS, CHANNEL_LABELS, LeadOrigin, LeadChannel } from "@/types/lead";
import { groupConversion, winRate, avgTicket, totalWonValue, lossReasonBreakdown, ConvRow } from "@/lib/conversion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, DollarSign, Target, Trophy } from "lucide-react";

type Period = "7d" | "14d" | "1m" | "3m" | "1y" | "all";
const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Últimos 7 dias", "14d": "Últimos 14 dias", "1m": "Último mês",
  "3m": "Últimos 3 meses", "1y": "Último ano", all: "Todo o período",
};
const periodToDays: Record<Period, number | null> = { "7d": 7, "14d": 14, "1m": 30, "3m": 90, "1y": 365, all: null };

const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ConversionReport: React.FC = () => {
  const { leads } = useLeads();
  const members = useCompanyMembers();
  const [period, setPeriod] = useState<Period>("3m");

  const memberName = (id: string) => members.find((m) => m.userId === id)?.displayName ?? "Sem responsável";

  const filtered = useMemo(() => {
    const days = periodToDays[period];
    if (days === null) return leads;
    const cutoff = new Date(Date.now() - days * 86400000);
    return leads.filter((l) => new Date(l.createdAt) >= cutoff);
  }, [leads, period]);

  const byOrigin = useMemo(() => groupConversion(filtered, (l) => ORIGIN_LABELS[l.origin as LeadOrigin] ?? l.origin), [filtered]);
  const byChannel = useMemo(() => groupConversion(filtered.filter((l) => l.channel), (l) => CHANNEL_LABELS[l.channel as LeadChannel] ?? (l.channel as string)), [filtered]);
  const bySeller = useMemo(() => groupConversion(filtered, (l) => (l.assignedTo ? memberName(l.assignedTo) : "Sem responsável")), [filtered, members]);
  const losses = useMemo(() => lossReasonBreakdown(filtered), [filtered]);

  const total = filtered.length;
  const won = filtered.filter((l) => l.stage === "fechou").length;
  const wr = winRate(filtered);
  const ticket = avgTicket(filtered);
  const totalValue = totalWonValue(filtered);

  const originChart = byOrigin.map((r) => ({ name: r.key, taxa: Number(r.rate.toFixed(1)) }));
  const colors = ["hsl(220,70%,50%)", "hsl(270,60%,55%)", "hsl(152,60%,42%)", "hsl(38,92%,50%)", "hsl(0,72%,55%)", "hsl(220,10%,60%)"];

  const Metric = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" style={color ? { color } : undefined} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );

  const Table = ({ title, rows, showValue }: { title: string; rows: ConvRow[]; showValue?: boolean }) => (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Sem dados no período.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-[10px] uppercase text-muted-foreground font-medium pb-1 border-b border-border">
            <span>Origem</span><span className="text-right">Leads</span><span className="text-right">Vendas</span><span className="text-right">Taxa</span>
          </div>
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-sm items-center">
              <span className="text-foreground truncate" title={r.key}>{r.key}</span>
              <span className="text-right text-muted-foreground">{r.total}</span>
              <span className="text-right text-muted-foreground">{r.won}</span>
              <span className="text-right font-semibold text-foreground">{r.rate.toFixed(0)}%</span>
            </div>
          ))}
          {showValue && (
            <div className="pt-2 mt-1 border-t border-border text-xs text-muted-foreground flex justify-between">
              <span>Valor total fechado</span>
              <span className="font-semibold text-foreground">{fmtMoney(rows.reduce((s, r) => s + r.value, 0))}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Conversão</h2>
        <select className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Metric icon={Users} label="Leads no período" value={total} />
        <Metric icon={TrendingUp} label="Taxa de conversão" value={`${wr.toFixed(0)}%`} sub={`${won} fechados`} color="hsl(152,60%,42%)" />
        <Metric icon={Trophy} label="Vendas" value={won} color="hsl(152,60%,42%)" />
        <Metric icon={DollarSign} label="Valor fechado" value={fmtMoney(totalValue)} color="hsl(152,60%,42%)" />
        <Metric icon={Target} label="Ticket médio" value={fmtMoney(ticket)} color="hsl(220,70%,50%)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Taxa de conversão por origem (%)</h3>
          {originChart.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={originChart} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)", fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Taxa"]} />
                <Bar dataKey="taxa" radius={[6, 6, 0, 0]}>
                  {originChart.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Motivos de perda</h3>
          {losses.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhum lead perdido com motivo no período.</p>
          ) : (
            <div className="space-y-2.5">
              {losses.map((l) => {
                const max = losses[0].count || 1;
                return (
                  <div key={l.reason}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground truncate">{l.reason}</span>
                      <span className="text-muted-foreground">{l.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${(l.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Table title="Por origem" rows={byOrigin} showValue />
        <Table title="Por canal" rows={byChannel} />
        <Table title="Por vendedor" rows={bySeller} />
      </div>
    </div>
  );
};

export default ConversionReport;
