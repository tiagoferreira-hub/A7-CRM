import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const ConversationsReport: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const [data, setData] = useState<{ day: string; abertas: number; fechadas: number }[]>([]);

  useEffect(() => {
    if (!activeCompanyId) return;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 13);
      const { data: rows } = await (supabase as any).from("lead_history")
        .select("event_type, created_at")
        .eq("company_id", activeCompanyId)
        .in("event_type", ["conversation_opened", "conversation_closed"])
        .gte("created_at", since.toISOString());
      const map: Record<string, { abertas: number; fechadas: number }> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        const k = d.toISOString().slice(0, 10);
        map[k] = { abertas: 0, fechadas: 0 };
      }
      (rows ?? []).forEach((r: any) => {
        const k = r.created_at.slice(0, 10);
        if (!map[k]) return;
        if (r.event_type === "conversation_opened") map[k].abertas += 1;
        else map[k].fechadas += 1;
      });
      setData(Object.entries(map).map(([day, v]) => ({
        day: day.slice(5), abertas: v.abertas, fechadas: v.fechadas,
      })));
    })();
  }, [activeCompanyId]);

  const totals = data.reduce((acc, d) => ({ abertas: acc.abertas + d.abertas, fechadas: acc.fechadas + d.fechadas }), { abertas: 0, fechadas: 0 });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Conversas abertas (14d)</div>
          <div className="text-2xl font-bold text-foreground mt-1">{totals.abertas}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Conversas fechadas (14d)</div>
          <div className="text-2xl font-bold text-foreground mt-1">{totals.fechadas}</div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Conversas por dia</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="abertas" fill="hsl(var(--primary))" name="Abertas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fechadas" fill="hsl(var(--muted-foreground))" name="Fechadas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ConversationsReport;
