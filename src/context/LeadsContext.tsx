import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Lead, LeadStage } from "@/types/lead";

interface LeadsContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => Promise<Lead | null>;
  findLeadByPhone: (phone: string) => Lead | null;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (id: string, newStage: LeadStage) => void;
  loading: boolean;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export const useLeads = () => {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
};

// Map DB row to Lead type
const rowToLead = (row: any): Lead => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  origin: row.origin,
  stage: row.stage,
  service: row.service,
  value: Number(row.value),
  lastMessage: row.last_message,
  lastInteraction: row.last_interaction,
  observations: row.observations,
  createdAt: row.created_at,
});

export const LeadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId, role, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLeads = useCallback(async () => {
    if (!activeCompanyId) { setLeads([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false });
    let rows = data?.map(rowToLead) ?? [];
    // Seller sees only own leads (by observations responsável tag is not present; use related tasks assigned_to is on tasks). For now, sellers see all company leads — restrict only tasks. Keep leads visible.
    setLeads(rows);
    setLoading(false);
  }, [activeCompanyId, role, user]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const normalizePhone = (p: string) => (p || "").replace(/\D/g, "");

  const findLeadByPhone = useCallback((phone: string): Lead | null => {
    const target = normalizePhone(phone);
    if (!target) return null;
    return leads.find(l => normalizePhone(l.phone) === target) ?? null;
  }, [leads]);

  const addLead = useCallback(async (lead: Omit<Lead, "id" | "createdAt">): Promise<Lead | null> => {
    if (!activeCompanyId) return null;
    // Dedupe by phone within company
    const existing = leads.find(l => normalizePhone(l.phone) === normalizePhone(lead.phone));
    if (existing) return existing;
    const { data } = await supabase
      .from("leads")
      .insert({
        company_id: activeCompanyId,
        name: lead.name,
        phone: lead.phone,
        origin: lead.origin,
        stage: lead.stage,
        service: lead.service,
        value: lead.value,
        last_message: lead.lastMessage,
        last_interaction: lead.lastInteraction,
        observations: lead.observations,
      })
      .select()
      .single();
    if (data) {
      const created = rowToLead(data);
      setLeads(prev => [created, ...prev]);
      return created;
    }
    return null;
  }, [activeCompanyId, leads]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    if (!activeCompanyId) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.origin !== undefined) dbUpdates.origin = updates.origin;
    if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
    if (updates.service !== undefined) dbUpdates.service = updates.service;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.lastMessage !== undefined) dbUpdates.last_message = updates.lastMessage;
    if (updates.lastInteraction !== undefined) dbUpdates.last_interaction = updates.lastInteraction;
    if (updates.observations !== undefined) dbUpdates.observations = updates.observations;

    await supabase.from("leads").update(dbUpdates).eq("id", id).eq("company_id", activeCompanyId);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, [activeCompanyId]);

  const moveLead = useCallback(async (id: string, newStage: LeadStage) => {
    if (!activeCompanyId) return;
    await supabase.from("leads").update({ stage: newStage }).eq("id", id).eq("company_id", activeCompanyId);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l));
  }, [activeCompanyId]);

  return (
    <LeadsContext.Provider value={{ leads, addLead, updateLead, moveLead, loading }}>
      {children}
    </LeadsContext.Provider>
  );
};
