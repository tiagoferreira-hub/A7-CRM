import React, { useMemo } from "react";
import { useLeads } from "@/context/LeadsContext";
import { referrerRanking, referralSummary, referralLink } from "@/lib/referral";
import { Gift, Users, TrendingUp, DollarSign, Link2 } from "lucide-react";
import { toast } from "sonner";

const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Indicacoes: React.FC = () => {
  const { leads } = useLeads();

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    leads.forEach((l) => (m[l.id] = l.name));
    return m;
  }, [leads]);

  const ranking = useMemo(() => referrerRanking(leads), [leads]);
  const summary = useMemo(() => referralSummary(leads), [leads]);

  const copyLink = (referrerId: string) => {
    const link = referralLink(window.location.origin, referrerId);
    navigator.clipboard?.writeText(link).then(
      () => toast.success("Link de indicação copiado!"),
      () => toast.error("Não foi possível copiar."),
    );
  };

  const Metric = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color?: string }) => (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" style={color ? { color } : undefined} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Programa de Indicação</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={Users} label="Leads indicados" value={summary.totalReferred} />
          <Metric icon={Gift} label="Indicadores ativos" value={summary.activeReferrers} color="hsl(270,60%,55%)" />
          <Metric icon={TrendingUp} label="Conversão das indicações" value={`${summary.rate.toFixed(0)}%`} color="hsl(152,60%,42%)" />
          <Metric icon={DollarSign} label="Valor gerado" value={fmtMoney(summary.value)} color="hsl(152,60%,42%)" />
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Ranking de indicadores</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Quem mais traz clientes por indicação. Use o link para cada cliente divulgar — leads que entrarem por ele já vêm marcados como indicação.
          </p>
          {ranking.length === 0 ? (
            <div className="text-center py-10">
              <Gift className="w-9 h-9 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma indicação ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ao criar um lead, escolha "Indicado por" para começar a rastrear as indicações.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 text-[10px] uppercase text-muted-foreground font-medium pb-1 border-b border-border">
                <span>Indicador</span>
                <span className="text-right">Indicados</span>
                <span className="text-right">Fecharam</span>
                <span className="text-right">Taxa</span>
                <span className="text-right">Valor</span>
                <span className="text-right">Link</span>
              </div>
              {ranking.map((r) => (
                <div key={r.referrerId} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 text-sm items-center py-1.5 border-b border-border/50">
                  <span className="text-foreground truncate">{nameById[r.referrerId] ?? "Lead removido"}</span>
                  <span className="text-right text-muted-foreground">{r.referred}</span>
                  <span className="text-right text-muted-foreground">{r.won}</span>
                  <span className="text-right font-semibold text-foreground">{r.rate.toFixed(0)}%</span>
                  <span className="text-right text-muted-foreground">{fmtMoney(r.value)}</span>
                  <span className="text-right">
                    <button
                      onClick={() => copyLink(r.referrerId)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      title="Copiar link de indicação"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Copiar
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-card/50 border border-dashed border-border rounded-xl p-4">
          <strong className="text-foreground">Próximo passo (v2):</strong> uma página pública de captação
          (Edge Function no Supabase) que recebe o link <code>?ref=...</code> e cadastra o lead indicado
          automaticamente, sem precisar de login. Requer um access token do Supabase para publicar a função.
        </div>
      </div>
    </div>
  );
};

export default Indicacoes;
