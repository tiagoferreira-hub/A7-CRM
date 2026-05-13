import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { FollowUp, FollowUpStatus } from "@/types/automations";

interface Ctx {
  followUps: FollowUp[];
  loading: boolean;
  addFollowUp: (f: { leadId: string; scheduledAt: string; notes?: string; assignedTo?: string | null }) => Promise<FollowUp | null>;
  completeFollowUp: (id: string) => Promise<void>;
  deleteFollowUp: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const FollowUpsContext = createContext<Ctx | null>(null);
export const useFollowUps = () => {
  const ctx = useContext(FollowUpsContext);
  if (!ctx) throw new Error("useFollowUps must be used within FollowUpsProvider");
  return ctx;
};

const rowTo = (r: any): FollowUp => {
  let status: FollowUpStatus = r.status;
  if (status === "pendente" && new Date(r.scheduled_at) < new Date()) status = "atrasado";
  return {
    id: r.id,
    leadId: r.lead_id,
    assignedTo: r.assigned_to,
    scheduledAt: r.scheduled_at,
    notes: r.notes ?? "",
    status,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  };
};

export const FollowUpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId, user, role } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!activeCompanyId) { setFollowUps([]); return; }
    setLoading(true);
    let q = (supabase as any).from("follow_ups").select("*")
      .eq("company_id", activeCompanyId)
      .order("scheduled_at", { ascending: true });
    if (role === "seller" && user) q = q.eq("assigned_to", user.id);
    const { data } = await q;
    setFollowUps((data ?? []).map(rowTo));
    setLoading(false);
  }, [activeCompanyId, role, user]);

  useEffect(() => { reload(); }, [reload]);

  const addFollowUp = useCallback(async (f) => {
    if (!activeCompanyId) return null;
    const { data } = await (supabase as any).from("follow_ups").insert({
      company_id: activeCompanyId,
      lead_id: f.leadId,
      scheduled_at: f.scheduledAt,
      notes: f.notes ?? "",
      assigned_to: f.assignedTo ?? user?.id ?? null,
      created_by: user?.id ?? null,
      status: "pendente",
    }).select().single();
    if (data) {
      const item = rowTo(data);
      setFollowUps(prev => [...prev, item].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      return item;
    }
    return null;
  }, [activeCompanyId, user]);

  const completeFollowUp = useCallback(async (id: string) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("follow_ups")
      .update({ status: "concluido", completed_at: new Date().toISOString() })
      .eq("id", id).eq("company_id", activeCompanyId);
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: "concluido", completedAt: new Date().toISOString() } : f));
  }, [activeCompanyId]);

  const deleteFollowUp = useCallback(async (id: string) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("follow_ups").delete().eq("id", id).eq("company_id", activeCompanyId);
    setFollowUps(prev => prev.filter(f => f.id !== id));
  }, [activeCompanyId]);

  const value = useMemo(() => ({ followUps, loading, addFollowUp, completeFollowUp, deleteFollowUp, reload }),
    [followUps, loading, addFollowUp, completeFollowUp, deleteFollowUp, reload]);

  return <FollowUpsContext.Provider value={value}>{children}</FollowUpsContext.Provider>;
};
