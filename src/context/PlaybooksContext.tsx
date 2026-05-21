import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { LeadStage } from "@/types/lead";

export type PlaybookViewMode = "document" | "flow";
export interface PlaybookSection { id: string; title: string; content: string; }
export interface PlaybookFlowNode { id: string; parentId: string | null; situation: string; response: string; }

export interface Playbook {
  id: string;
  title: string;
  description: string;
  viewMode: PlaybookViewMode;
  sections: PlaybookSection[];
  flowNodes: PlaybookFlowNode[];
  createdAt: string;
}

export interface Script {
  id: string;
  name: string;
  stage: LeadStage;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export interface ScriptUsage {
  id: string;
  scriptId: string;
  conversationId: string;
  leadId: string;
  leadStageAtUse: string | null;
  usedAt: string;
}

interface Ctx {
  playbooks: Playbook[];
  scripts: Script[];
  usages: ScriptUsage[];
  loading: boolean;
  createPlaybook: (p: Pick<Playbook, "title" | "description" | "viewMode">) => Promise<Playbook | null>;
  updatePlaybook: (id: string, updates: Partial<Playbook>) => Promise<void>;
  deletePlaybook: (id: string) => Promise<void>;
  createScript: (s: Pick<Script, "name" | "stage" | "content" | "isActive">) => Promise<Script | null>;
  updateScript: (id: string, updates: Partial<Script>) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;
  toggleScriptActive: (id: string, active: boolean) => Promise<void>;
  recordUsage: (scriptId: string, conversationId: string, leadId: string, stage: string | null) => Promise<void>;
}

const PlaybooksContext = createContext<Ctx | null>(null);
export const usePlaybooks = () => {
  const c = useContext(PlaybooksContext);
  if (!c) throw new Error("usePlaybooks must be used within PlaybooksProvider");
  return c;
};

const rowToPlaybook = (r: any): Playbook => ({
  id: r.id, title: r.title, description: r.description ?? "",
  viewMode: r.view_mode, sections: r.sections ?? [], flowNodes: r.flow_nodes ?? [],
  createdAt: r.created_at,
});
const rowToScript = (r: any): Script => ({
  id: r.id, name: r.name, stage: r.stage, content: r.content,
  isActive: r.is_active, createdAt: r.created_at,
});
const rowToUsage = (r: any): ScriptUsage => ({
  id: r.id, scriptId: r.script_id, conversationId: r.conversation_id,
  leadId: r.lead_id, leadStageAtUse: r.lead_stage_at_use, usedAt: r.used_at,
});

export const PlaybooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId, user } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [usages, setUsages] = useState<ScriptUsage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) { setPlaybooks([]); setScripts([]); setUsages([]); return; }
    setLoading(true);
    const [pb, sc, us] = await Promise.all([
      supabase.from("playbooks").select("*").eq("company_id", activeCompanyId).order("created_at", { ascending: false }),
      supabase.from("scripts").select("*").eq("company_id", activeCompanyId).order("created_at", { ascending: false }),
      supabase.from("script_usage").select("*").eq("company_id", activeCompanyId),
    ]);
    setPlaybooks(pb.data?.map(rowToPlaybook) ?? []);
    setScripts(sc.data?.map(rowToScript) ?? []);
    setUsages(us.data?.map(rowToUsage) ?? []);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const createPlaybook: Ctx["createPlaybook"] = useCallback(async (p) => {
    if (!activeCompanyId) return null;
    const { data } = await supabase.from("playbooks").insert({
      company_id: activeCompanyId,
      title: p.title, description: p.description, view_mode: p.viewMode,
      sections: [], flow_nodes: [],
    }).select().single();
    if (!data) return null;
    const pb = rowToPlaybook(data);
    setPlaybooks(prev => [pb, ...prev]);
    return pb;
  }, [activeCompanyId]);

  const updatePlaybook: Ctx["updatePlaybook"] = useCallback(async (id, updates) => {
    const dbUp: any = {};
    if (updates.title !== undefined) dbUp.title = updates.title;
    if (updates.description !== undefined) dbUp.description = updates.description;
    if (updates.viewMode !== undefined) dbUp.view_mode = updates.viewMode;
    if (updates.sections !== undefined) dbUp.sections = updates.sections;
    if (updates.flowNodes !== undefined) dbUp.flow_nodes = updates.flowNodes;
    await supabase.from("playbooks").update(dbUp).eq("id", id);
    setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePlaybook: Ctx["deletePlaybook"] = useCallback(async (id) => {
    await supabase.from("playbooks").delete().eq("id", id);
    setPlaybooks(prev => prev.filter(p => p.id !== id));
  }, []);

  const createScript: Ctx["createScript"] = useCallback(async (s) => {
    if (!activeCompanyId) return null;
    // if activating, deactivate others on same stage
    if (s.isActive) {
      await supabase.from("scripts").update({ is_active: false })
        .eq("company_id", activeCompanyId).eq("stage", s.stage);
    }
    const { data } = await supabase.from("scripts").insert({
      company_id: activeCompanyId, name: s.name, stage: s.stage,
      content: s.content, is_active: s.isActive,
    }).select().single();
    if (!data) return null;
    const sc = rowToScript(data);
    setScripts(prev => [sc, ...(s.isActive ? prev.map(x => x.stage === s.stage ? { ...x, isActive: false } : x) : prev)]);
    return sc;
  }, [activeCompanyId]);

  const updateScript: Ctx["updateScript"] = useCallback(async (id, updates) => {
    const dbUp: any = {};
    if (updates.name !== undefined) dbUp.name = updates.name;
    if (updates.stage !== undefined) dbUp.stage = updates.stage;
    if (updates.content !== undefined) dbUp.content = updates.content;
    if (updates.isActive !== undefined) dbUp.is_active = updates.isActive;
    await supabase.from("scripts").update(dbUp).eq("id", id);
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteScript: Ctx["deleteScript"] = useCallback(async (id) => {
    await supabase.from("scripts").delete().eq("id", id);
    setScripts(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleScriptActive: Ctx["toggleScriptActive"] = useCallback(async (id, active) => {
    if (!activeCompanyId) return;
    const target = scripts.find(s => s.id === id);
    if (!target) return;
    if (active) {
      await supabase.from("scripts").update({ is_active: false })
        .eq("company_id", activeCompanyId).eq("stage", target.stage);
    }
    await supabase.from("scripts").update({ is_active: active }).eq("id", id);
    setScripts(prev => prev.map(s => {
      if (s.id === id) return { ...s, isActive: active };
      if (active && s.stage === target.stage) return { ...s, isActive: false };
      return s;
    }));
  }, [activeCompanyId, scripts]);

  const recordUsage: Ctx["recordUsage"] = useCallback(async (scriptId, conversationId, leadId, stage) => {
    if (!activeCompanyId) return;
    const { data } = await supabase.from("script_usage").insert({
      company_id: activeCompanyId, script_id: scriptId,
      conversation_id: conversationId, lead_id: leadId,
      used_by: user?.id ?? null, lead_stage_at_use: stage,
    }).select().single();
    if (data) setUsages(prev => [rowToUsage(data), ...prev]);
  }, [activeCompanyId, user]);

  return (
    <PlaybooksContext.Provider value={{
      playbooks, scripts, usages, loading,
      createPlaybook, updatePlaybook, deletePlaybook,
      createScript, updateScript, deleteScript, toggleScriptActive,
      recordUsage,
    }}>
      {children}
    </PlaybooksContext.Provider>
  );
};
