import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Lead, LeadStage, LifecycleTrigger } from "@/types/lead";

interface LeadsContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => Promise<Lead | null>;
  findLeadByPhone: (phone: string) => Lead | null;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (
    id: string,
    newStage: LeadStage,
    lossReason?: string | null,
    meta?: { trigger?: LifecycleTrigger; triggerRef?: string | null },
  ) => void;
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
  services: Array.isArray(row.services) ? row.services : (row.service ? [row.service] : []),
  value: Number(row.value),
  lastMessage: row.last_message,
  lastInteraction: row.last_interaction,
  observations: row.observations,
  createdAt: row.created_at,
  assignedTo: row.assigned_to ?? null,
  lossReason: row.loss_reason ?? null,
  channel: row.channel ?? undefined,
  source: row.source ?? null,
  utmSource: row.utm_source ?? null,
  utmMedium: row.utm_medium ?? null,
  utmCampaign: row.utm_campaign ?? null,
  utmContent: row.utm_content ?? null,
  utmTerm: row.utm_term ?? null,
  adId: row.ad_id ?? null,
  referrer: row.referrer ?? null,
  referredByLeadId: row.referred_by_lead_id ?? null,
  procedureInterestId: row.procedure_interest_id ?? null,
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
    const servicesArr = (lead.services && lead.services.length) ? lead.services : (lead.service ? [lead.service] : []);
    const { data } = await supabase
      .from("leads")
      .insert({
        company_id: activeCompanyId,
        name: lead.name,
        phone: lead.phone,
        origin: lead.origin,
        stage: lead.stage,
        service: servicesArr[0] ?? "",
        services: servicesArr,
        value: lead.value,
        last_message: lead.lastMessage,
        last_interaction: lead.lastInteraction,
        observations: lead.observations,
        // origem/canal + rastreamento de campanha (FASE 1.2)
        channel: lead.channel ?? undefined,
        source: lead.source ?? undefined,
        utm_source: lead.utmSource ?? undefined,
        utm_medium: lead.utmMedium ?? undefined,
        utm_campaign: lead.utmCampaign ?? undefined,
        utm_content: lead.utmContent ?? undefined,
        utm_term: lead.utmTerm ?? undefined,
        ad_id: lead.adId ?? undefined,
        referrer: lead.referrer ?? undefined,
        referred_by_lead_id: lead.referredByLeadId ?? undefined,
        procedure_interest_id: lead.procedureInterestId ?? undefined,
      } as any)
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
    if ((updates as any).services !== undefined) {
      const arr = (updates as any).services as string[];
      dbUpdates.services = arr;
      dbUpdates.service = arr[0] ?? "";
    }
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.lastMessage !== undefined) dbUpdates.last_message = updates.lastMessage;
    if (updates.lastInteraction !== undefined) dbUpdates.last_interaction = updates.lastInteraction;
    if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
    if ((updates as any).assignedTo !== undefined) dbUpdates.assigned_to = (updates as any).assignedTo;
    if ((updates as any).lossReason !== undefined) dbUpdates.loss_reason = (updates as any).lossReason;
    if (updates.channel !== undefined) dbUpdates.channel = updates.channel;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if ((updates as any).referredByLeadId !== undefined) dbUpdates.referred_by_lead_id = (updates as any).referredByLeadId;
    if ((updates as any).procedureInterestId !== undefined) dbUpdates.procedure_interest_id = (updates as any).procedureInterestId;

    const { error } = await supabase.from("leads").update(dbUpdates).eq("id", id).eq("company_id", activeCompanyId);
    if (error) throw error;
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, [activeCompanyId]);

  // Função ÚNICA de mudança de etapa (moveLeadStage do brief): atualiza o lead e
  // grava o evento em lifecycle_events com a origem da mudança (trigger_type).
  const moveLead = useCallback(async (
    id: string,
    newStage: LeadStage,
    lossReason?: string | null,
    meta?: { trigger?: LifecycleTrigger; triggerRef?: string | null },
  ) => {
    if (!activeCompanyId) return;
    const fromStage = leads.find(l => l.id === id)?.stage ?? null;
    if (fromStage === newStage) return; // nada mudou, não registra evento

    const upd: any = { stage: newStage };
    if (newStage === "perdido" && lossReason !== undefined) upd.loss_reason = lossReason;
    await supabase.from("leads").update(upd).eq("id", id).eq("company_id", activeCompanyId);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage, lossReason: upd.loss_reason ?? l.lossReason } : l));

    // Evento de lifecycle (append-only). Falha aqui não deve travar a UI; a tabela
    // pode ainda não existir até a migration ser aplicada no banco.
    try {
      await (supabase as any).from("lifecycle_events").insert({
        company_id: activeCompanyId,
        lead_id: id,
        from_stage: fromStage,
        to_stage: newStage,
        trigger_type: meta?.trigger ?? "manual",
        trigger_ref: meta?.triggerRef ?? null,
        created_by: user?.id ?? null,
      });
    } catch {
      /* lifecycle_events ainda não disponível — ignorar silenciosamente */
    }
  }, [activeCompanyId, leads, user]);

  return (
    <LeadsContext.Provider value={{ leads, addLead, findLeadByPhone, updateLead, moveLead, loading }}>
      {children}
    </LeadsContext.Provider>
  );
};
