import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface SalesTarget {
  id: string;
  userId: string;
  periodYear: number;
  periodMonth: number;
  targetRevenue: number;
  targetLeads: number;
  commissionRate: number;
}

function rowToTarget(r: Record<string, unknown>): SalesTarget {
  return {
    id:             r.id as string,
    userId:         r.user_id as string,
    periodYear:     r.period_year as number,
    periodMonth:    r.period_month as number,
    targetRevenue:  Number(r.target_revenue),
    targetLeads:    r.target_leads as number,
    commissionRate: Number(r.commission_rate),
  };
}

export function useSalesTargets(year: number, month: number) {
  const { companyId } = useAuth();
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("sales_targets")
      .select("*")
      .eq("company_id", companyId)
      .eq("period_year", year)
      .eq("period_month", month);
    setTargets((data ?? []).map(rowToTarget));
    setLoading(false);
  }, [companyId, year, month]);

  useEffect(() => { load(); }, [load]);

  const upsertTarget = useCallback(
    async (userId: string, patch: Partial<Omit<SalesTarget, "id" | "userId" | "periodYear" | "periodMonth">>) => {
      if (!companyId) return;
      await supabase.from("sales_targets").upsert({
        company_id:      companyId,
        user_id:         userId,
        period_year:     year,
        period_month:    month,
        target_revenue:  patch.targetRevenue,
        target_leads:    patch.targetLeads,
        commission_rate: patch.commissionRate,
      }, { onConflict: "company_id,user_id,period_year,period_month" });
      load();
    },
    [companyId, year, month, load]
  );

  return { targets, loading, upsertTarget, reload: load };
}
