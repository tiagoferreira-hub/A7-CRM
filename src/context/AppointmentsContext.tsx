import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Appointment, AppointmentStatus, AppointmentType } from "@/types/appointment";

interface AppointmentsContextType {
  appointments: Appointment[];
  loading: boolean;
  addAppointment: (a: {
    leadId: string;
    assignedTo?: string | null;
    scheduledAt: string;
    durationMinutes?: number;
    type: AppointmentType;
    status?: AppointmentStatus;
    notes?: string;
    procedureId?: string | null;
  }) => Promise<Appointment | null>;
  updateAppointment: (id: string, updates: Partial<Omit<Appointment, "id" | "createdAt">>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextType | null>(null);

export const useAppointments = () => {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error("useAppointments must be used within AppointmentsProvider");
  return ctx;
};

const rowToAppt = (r: any): Appointment => ({
  id: r.id,
  leadId: r.lead_id,
  assignedTo: r.assigned_to,
  scheduledAt: r.scheduled_at,
  durationMinutes: r.duration_minutes ?? 60,
  type: r.appointment_type,
  status: r.status,
  notes: r.notes ?? "",
  createdAt: r.created_at,
  procedureId: r.procedure_id ?? null,
});

export const AppointmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId, role, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!activeCompanyId) { setAppointments([]); return; }
    setLoading(true);
    let q = (supabase as any)
      .from("appointments")
      .select("*")
      .eq("company_id", activeCompanyId)
      .order("scheduled_at", { ascending: true });
    if (role === "seller" && user) q = q.eq("assigned_to", user.id);
    const { data } = await q;
    setAppointments((data ?? []).map(rowToAppt));
    setLoading(false);
  }, [activeCompanyId, role, user]);

  useEffect(() => { reload(); }, [reload]);

  const addAppointment = useCallback(async (a) => {
    if (!activeCompanyId) return null;
    const { data } = await (supabase as any)
      .from("appointments")
      .insert({
        company_id: activeCompanyId,
        lead_id: a.leadId,
        assigned_to: a.assignedTo ?? user?.id ?? null,
        scheduled_at: a.scheduledAt,
        duration_minutes: a.durationMinutes ?? 60,
        appointment_type: a.type,
        status: a.status ?? "agendado",
        notes: a.notes ?? "",
        procedure_id: a.procedureId ?? null,
      })
      .select()
      .single();
    if (data) {
      const item = rowToAppt(data);
      setAppointments(prev => [...prev, item].sort((x, y) => x.scheduledAt.localeCompare(y.scheduledAt)));
      return item;
    }
    return null;
  }, [activeCompanyId, user]);

  const updateAppointment = useCallback(async (id, updates) => {
    if (!activeCompanyId) return;
    const db: any = {};
    if (updates.leadId !== undefined) db.lead_id = updates.leadId;
    if (updates.assignedTo !== undefined) db.assigned_to = updates.assignedTo;
    if (updates.scheduledAt !== undefined) db.scheduled_at = updates.scheduledAt;
    if (updates.durationMinutes !== undefined) db.duration_minutes = updates.durationMinutes;
    if (updates.type !== undefined) db.appointment_type = updates.type;
    if (updates.status !== undefined) db.status = updates.status;
    if (updates.notes !== undefined) db.notes = updates.notes;
    if (updates.procedureId !== undefined) db.procedure_id = updates.procedureId;
    await (supabase as any).from("appointments").update(db).eq("id", id).eq("company_id", activeCompanyId);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } as Appointment : a));
  }, [activeCompanyId]);

  const deleteAppointment = useCallback(async (id) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("appointments").delete().eq("id", id).eq("company_id", activeCompanyId);
    setAppointments(prev => prev.filter(a => a.id !== id));
  }, [activeCompanyId]);

  return (
    <AppointmentsContext.Provider value={{ appointments, loading, addAppointment, updateAppointment, deleteAppointment, reload }}>
      {children}
    </AppointmentsContext.Provider>
  );
};
