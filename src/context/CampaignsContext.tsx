import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Campaign, CampaignChannel, CampaignStatus } from "@/types/automations";

interface Ctx {
  campaigns: Campaign[];
  loading: boolean;
  addCampaign: (c: { name: string; channel: CampaignChannel; scheduledAt?: string | null; payload?: any }) => Promise<void>;
  updateCampaign: (id: string, updates: { name?: string; channel?: CampaignChannel; scheduledAt?: string | null; payload?: any }) => Promise<void>;
  setCampaignStatus: (id: string, status: CampaignStatus) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

const CampaignsContext = createContext<Ctx | null>(null);
export const useCampaigns = () => {
  const ctx = useContext(CampaignsContext);
  if (!ctx) throw new Error("useCampaigns must be used within CampaignsProvider");
  return ctx;
};

const rowTo = (r: any): Campaign => ({
  id: r.id, name: r.name, channel: r.channel, status: r.status,
  scheduledAt: r.scheduled_at, sentCount: r.sent_count ?? 0, repliedCount: r.replied_count ?? 0,
  payload: r.payload ?? {},
});

export const CampaignsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!activeCompanyId) { setCampaigns([]); return; }
    setLoading(true);
    const { data } = await (supabase as any).from("campaigns").select("*")
      .eq("company_id", activeCompanyId).order("created_at", { ascending: false });
    setCampaigns((data ?? []).map(rowTo));
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { reload(); }, [reload]);

  const addCampaign = useCallback(async (c) => {
    if (!activeCompanyId) return;
    const { data } = await (supabase as any).from("campaigns").insert({
      company_id: activeCompanyId,
      name: c.name, channel: c.channel, scheduled_at: c.scheduledAt ?? null, status: "agendado",
    }).select().single();
    if (data) setCampaigns(prev => [rowTo(data), ...prev]);
  }, [activeCompanyId]);

  const setCampaignStatus = useCallback(async (id, status) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("campaigns").update({ status }).eq("id", id).eq("company_id", activeCompanyId);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, [activeCompanyId]);

  const deleteCampaign = useCallback(async (id) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("campaigns").delete().eq("id", id).eq("company_id", activeCompanyId);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  }, [activeCompanyId]);

  return <CampaignsContext.Provider value={{ campaigns, loading, addCampaign, setCampaignStatus, deleteCampaign }}>{children}</CampaignsContext.Provider>;
};
