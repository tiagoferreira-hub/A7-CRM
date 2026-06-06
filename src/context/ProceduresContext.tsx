import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Procedure, ProcedureFollowup } from "@/types/procedure";

interface ProceduresContextType {
  procedures: Procedure[];
  loading: boolean;
  addProcedure: (p: Omit<Procedure, "id" | "followups">) => Promise<Procedure | null>;
  updateProcedure: (id: string, updates: Partial<Omit<Procedure, "id" | "followups">>) => Promise<void>;
  deleteProcedure: (id: string) => Promise<void>;
  addFollowup: (procedureId: string, f: Omit<ProcedureFollowup, "id" | "procedureId">) => Promise<void>;
  updateFollowup: (id: string, updates: Partial<Omit<ProcedureFollowup, "id" | "procedureId">>) => Promise<void>;
  deleteFollowup: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ProceduresContext = createContext<ProceduresContextType | null>(null);

export const useProcedures = () => {
  const ctx = useContext(ProceduresContext);
  if (!ctx) throw new Error("useProcedures must be used within ProceduresProvider");
  return ctx;
};

const rowToProc = (r: any): Omit<Procedure, "followups"> => ({
  id: r.id,
  name: r.name,
  category: r.category ?? "",
  description: r.description ?? "",
  price: Number(r.price ?? 0),
  workMinutes: Number(r.work_minutes ?? 60),
  isRecurring: r.is_recurring ?? false,
  recurrenceDays: r.recurrence_days ?? null,
  indications: r.indications ?? "",
  contraindications: r.contraindications ?? "",
  relevantInfo: r.relevant_info ?? "",
  active: r.active ?? true,
});

const rowToFup = (r: any): ProcedureFollowup => ({
  id: r.id,
  procedureId: r.procedure_id,
  offsetDays: Number(r.offset_days ?? 0),
  title: r.title,
  channel: r.channel ?? "mensagem",
  messageTemplate: r.message_template ?? "",
  orderIndex: Number(r.order_index ?? 0),
});

const procToRow = (p: Partial<Omit<Procedure, "id" | "followups">>): any => {
  const row: any = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.category !== undefined) row.category = p.category;
  if (p.description !== undefined) row.description = p.description;
  if (p.price !== undefined) row.price = p.price;
  if (p.workMinutes !== undefined) row.work_minutes = p.workMinutes;
  if (p.isRecurring !== undefined) row.is_recurring = p.isRecurring;
  if (p.recurrenceDays !== undefined) row.recurrence_days = p.recurrenceDays;
  if (p.indications !== undefined) row.indications = p.indications;
  if (p.contraindications !== undefined) row.contraindications = p.contraindications;
  if (p.relevantInfo !== undefined) row.relevant_info = p.relevantInfo;
  if (p.active !== undefined) row.active = p.active;
  return row;
};

const fupToRow = (f: Partial<Omit<ProcedureFollowup, "id" | "procedureId">>): any => {
  const row: any = {};
  if (f.offsetDays !== undefined) row.offset_days = f.offsetDays;
  if (f.title !== undefined) row.title = f.title;
  if (f.channel !== undefined) row.channel = f.channel;
  if (f.messageTemplate !== undefined) row.message_template = f.messageTemplate;
  if (f.orderIndex !== undefined) row.order_index = f.orderIndex;
  return row;
};

export const ProceduresProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!activeCompanyId) { setProcedures([]); return; }
    setLoading(true);
    const [{ data: procs }, { data: fups }] = await Promise.all([
      (supabase as any).from("procedures").select("*").eq("company_id", activeCompanyId).order("name"),
      (supabase as any).from("procedure_followups").select("*").eq("company_id", activeCompanyId).order("order_index"),
    ]);
    const byProc: Record<string, ProcedureFollowup[]> = {};
    (fups ?? []).forEach((r: any) => {
      const f = rowToFup(r);
      (byProc[f.procedureId] ||= []).push(f);
    });
    setProcedures((procs ?? []).map((r: any) => ({ ...rowToProc(r), followups: byProc[r.id] ?? [] })));
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { reload(); }, [reload]);

  const addProcedure = useCallback(async (p: Omit<Procedure, "id" | "followups">) => {
    if (!activeCompanyId) return null;
    const { data } = await (supabase as any)
      .from("procedures")
      .insert({ company_id: activeCompanyId, ...procToRow(p) })
      .select().single();
    if (!data) return null;
    const created: Procedure = { ...rowToProc(data), followups: [] };
    setProcedures((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, [activeCompanyId]);

  const updateProcedure = useCallback(async (id: string, updates: Partial<Omit<Procedure, "id" | "followups">>) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("procedures").update(procToRow(updates)).eq("id", id).eq("company_id", activeCompanyId);
    setProcedures((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, [activeCompanyId]);

  const deleteProcedure = useCallback(async (id: string) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("procedures").delete().eq("id", id).eq("company_id", activeCompanyId);
    setProcedures((prev) => prev.filter((p) => p.id !== id));
  }, [activeCompanyId]);

  const addFollowup = useCallback(async (procedureId: string, f: Omit<ProcedureFollowup, "id" | "procedureId">) => {
    if (!activeCompanyId) return;
    const { data } = await (supabase as any)
      .from("procedure_followups")
      .insert({ company_id: activeCompanyId, procedure_id: procedureId, ...fupToRow(f) })
      .select().single();
    if (!data) return;
    const created = rowToFup(data);
    setProcedures((prev) => prev.map((p) =>
      p.id === procedureId ? { ...p, followups: [...p.followups, created].sort((a, b) => a.orderIndex - b.orderIndex) } : p));
  }, [activeCompanyId]);

  const updateFollowup = useCallback(async (id: string, updates: Partial<Omit<ProcedureFollowup, "id" | "procedureId">>) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("procedure_followups").update(fupToRow(updates)).eq("id", id).eq("company_id", activeCompanyId);
    setProcedures((prev) => prev.map((p) => ({
      ...p,
      followups: p.followups.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })));
  }, [activeCompanyId]);

  const deleteFollowup = useCallback(async (id: string) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("procedure_followups").delete().eq("id", id).eq("company_id", activeCompanyId);
    setProcedures((prev) => prev.map((p) => ({ ...p, followups: p.followups.filter((f) => f.id !== id) })));
  }, [activeCompanyId]);

  return (
    <ProceduresContext.Provider value={{ procedures, loading, addProcedure, updateProcedure, deleteProcedure, addFollowup, updateFollowup, deleteFollowup, reload }}>
      {children}
    </ProceduresContext.Provider>
  );
};
