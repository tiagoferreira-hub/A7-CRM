import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AutomationFlow, AutomationFlowStep, FlowActionType, FlowStatus, FlowTriggerType } from "@/types/automations";

interface Ctx {
  flows: AutomationFlow[];
  steps: AutomationFlowStep[];
  loading: boolean;
  addFlow: (f: { name: string; triggerType: FlowTriggerType; triggerConfig?: any; steps?: Omit<AutomationFlowStep, "id" | "flowId">[] }) => Promise<AutomationFlow | null>;
  updateFlow: (id: string, updates: { name?: string; triggerType?: FlowTriggerType; triggerConfig?: any; steps?: Omit<AutomationFlowStep, "id" | "flowId">[] }) => Promise<void>;
  setFlowStatus: (id: string, status: FlowStatus) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const FlowsContext = createContext<Ctx | null>(null);
export const useAutomationFlows = () => {
  const ctx = useContext(FlowsContext);
  if (!ctx) throw new Error("useAutomationFlows must be used within AutomationFlowsProvider");
  return ctx;
};

const rowToFlow = (r: any): AutomationFlow => ({
  id: r.id, name: r.name, triggerType: r.trigger_type, triggerConfig: r.trigger_config,
  status: r.status, createdAt: r.created_at,
});
const rowToStep = (r: any): AutomationFlowStep => ({
  id: r.id, flowId: r.flow_id, orderIndex: r.order_index, delayMinutes: r.delay_minutes,
  actionType: r.action_type, actionConfig: r.action_config,
});

export const AutomationFlowsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId, user } = useAuth();
  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [steps, setSteps] = useState<AutomationFlowStep[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!activeCompanyId) { setFlows([]); setSteps([]); return; }
    setLoading(true);
    const [{ data: f }, { data: s }] = await Promise.all([
      (supabase as any).from("automation_flows").select("*").eq("company_id", activeCompanyId).order("created_at", { ascending: false }),
      (supabase as any).from("automation_flow_steps").select("*").eq("company_id", activeCompanyId).order("order_index"),
    ]);
    setFlows((f ?? []).map(rowToFlow));
    setSteps((s ?? []).map(rowToStep));
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { reload(); }, [reload]);

  const addFlow = useCallback(async ({ name, triggerType, triggerConfig = {}, steps: st = [] }) => {
    if (!activeCompanyId) return null;
    const { data } = await (supabase as any).from("automation_flows").insert({
      company_id: activeCompanyId, name, trigger_type: triggerType, trigger_config: triggerConfig,
      status: "rascunho", created_by: user?.id ?? null,
    }).select().single();
    if (!data) return null;
    const flow = rowToFlow(data);
    if (st.length) {
      const rows = st.map((x, i) => ({
        flow_id: flow.id, company_id: activeCompanyId, order_index: x.orderIndex ?? i,
        delay_minutes: x.delayMinutes, action_type: x.actionType, action_config: x.actionConfig ?? {},
      }));
      const { data: sd } = await (supabase as any).from("automation_flow_steps").insert(rows).select();
      if (sd) setSteps(prev => [...prev, ...sd.map(rowToStep)]);
    }
    setFlows(prev => [flow, ...prev]);
    return flow;
  }, [activeCompanyId, user]);

  const setFlowStatus = useCallback(async (id: string, status: FlowStatus) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("automation_flows").update({ status }).eq("id", id).eq("company_id", activeCompanyId);
    setFlows(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  }, [activeCompanyId]);

  const deleteFlow = useCallback(async (id: string) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("automation_flows").delete().eq("id", id).eq("company_id", activeCompanyId);
    setFlows(prev => prev.filter(f => f.id !== id));
    setSteps(prev => prev.filter(s => s.flowId !== id));
  }, [activeCompanyId]);

  const value = useMemo(() => ({ flows, steps, loading, addFlow, setFlowStatus, deleteFlow, reload }),
    [flows, steps, loading, addFlow, setFlowStatus, deleteFlow, reload]);

  return <FlowsContext.Provider value={value}>{children}</FlowsContext.Provider>;
};
