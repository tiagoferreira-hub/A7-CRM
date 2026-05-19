import React, { useState, useMemo } from "react";
import { useLeads } from "@/context/LeadsContext";
import { ORIGIN_LABELS, ORIGIN_OPTIONS, STAGE_LABELS, LeadOrigin } from "@/types/lead";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Users, Calendar, CheckCircle, XCircle, DollarSign, Target } from "lucide-react";

type Period = "yesterday" | "7d" | "14d" | "1m" | "3m" | "1y";

const PERIOD_LABELS: Record<Period, string> = {
  yesterday: "Ontem",
  "7d": "Últimos 7 dias",
  "14d": "Últimos 14 dias",
  "1m": "Último mês",
  "3m": "Últimos 3 meses",
  "1y": "Último ano",
};

const periodToDays: Record<Period, number> = {
  yesterday: 1,
  "7d": 7,
  "14d": 14,
  "1m": 30,
  "3m": 90,
  "1y": 365,
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Dashboard: React.FC = () => {
  const { leads } = useLeads();
  const [period, setPeriod] = useState<Period>("1m");

  const filtered = useMemo(() => {
    const now = new Date();
    const days = periodToDays[period];
    const cutoff = new Date(now.getTime() - days * 86400000);
    return leads.filter((l) => new Date(l.createdAt) >= cutoff);
  }, [leads, period]);

  const allInPeriod = filtered;

  const byOrigin = useMemo(() => {
    const map: Record<LeadOrigin, number> = { manual: 0, bio_instagram: 0, meta: 0, google_ads: 0, indicacao: 0, organico: 0 };
    allInPeriod.forEach((l) => map[l.origin]++);
    return map;
  }, [allInPeriod]);

  const agendados = allInPeriod.filter((l) => ["agendado", "compareceu", "fechou"].includes(l.stage)).length;
  const compareceu = allInPeriod.filter((l) => ["compareceu", "fechou"].includes(l.stage)).length;
  const fechou = allInPeriod.filter((l) => l.stage === "fechou").length;
  const perdidos = allInPeriod.filter((l) => l.stage === "perdido").length;
  const totalLeads = allInPeriod.length;

  const valorTotal = allInPeriod.filter((l) => l.stage === "fechou").reduce((s, l) => s + l.value, 0);
  const ticketMedio = fechou > 0 ? valorTotal / fechou : 0;

  // Funnel conversion rates
  const stageCount = (stages: string[]) => allInPeriod.filter((l) => stages.includes(l.stage)).length;
  const funnelStages = [
    { from: "Lead entrou", to: "Lead Quente", rate: totalLeads > 0 ? (stageCount(["hot_lead", "agendado", "compareceu", "fechou"]) / totalLeads * 100) : 0 },
    { from: "Lead Quente", to: "Agendado", rate: stageCount(["hot_lead", "agendado", "compareceu", "fechou"]) > 0 ? (stageCount(["agendado", "compareceu", "fechou"]) / stageCount(["hot_lead", "agendado", "compareceu", "fechou"]) * 100) : 0 },
    { from: "Agendado", to: "Compareceu", rate: stageCount(["agendado", "compareceu", "fechou"]) > 0 ? (stageCount(["compareceu", "fechou"]) / stageCount(["agendado", "compareceu", "fechou"]) * 100) : 0 },
    { from: "Compareceu", to: "Fechou", rate: stageCount(["compareceu", "fechou"]) > 0 ? (stageCount(["fechou"]) / stageCount(["compareceu", "fechou"]) * 100) : 0 },
  ];

  const originChartData = ORIGIN_OPTIONS.map((o) => ({
    name: ORIGIN_LABELS[o],
    value: byOrigin[o],
  }));

  const chartColors = [
    "hsl(220, 10%, 60%)",
    "hsl(270, 60%, 55%)",
    "hsl(220, 70%, 50%)",
    "hsl(38, 92%, 50%)",
  ];

  const MetricCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" style={color ? { color } : undefined} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <select
          className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          {Object.entries(PERIOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard icon={Users} label="Total de leads" value={totalLeads} />
        <MetricCard icon={Calendar} label="Agendamentos" value={agendados} color="hsl(220, 70%, 50%)" />
        <MetricCard icon={CheckCircle} label="Comparecimentos" value={compareceu} color="hsl(152, 60%, 42%)" />
        <MetricCard icon={TrendingUp} label="Vendas" value={fechou} color="hsl(152, 60%, 42%)" />
        <MetricCard icon={XCircle} label="Perdidos" value={perdidos} color="hsl(0, 72%, 55%)" />
      </div>

      {/* Financial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard icon={DollarSign} label="Valor total vendido" value={formatCurrency(valorTotal)} color="hsl(152, 60%, 42%)" />
        <MetricCard icon={Target} label="Ticket médio" value={formatCurrency(ticketMedio)} sub={fechou > 0 ? `Base: ${fechou} vendas` : "Sem vendas no período"} color="hsl(220, 70%, 50%)" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origin chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads por origem</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={originChartData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)", fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {originChartData.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel conversion */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Taxa de conversão por etapa</h3>
          <div className="space-y-3">
            {funnelStages.map((f, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{f.from} → {f.to}</span>
                  <span className="font-semibold text-foreground">{f.rate.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(f.rate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
