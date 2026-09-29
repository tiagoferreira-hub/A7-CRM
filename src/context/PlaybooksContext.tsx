import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { LeadStage } from "@/types/lead";
import { ScriptMoment, homeStageOf, legacyMomentFromStage, nextPosition } from "@/lib/scriptMoments";

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
  /** Momento do atendimento — é o que escolhe o script no painel. */
  moment: ScriptMoment;
  /** Legado: etapa-mãe do momento (null em objeção). Não usar para selecionar script. */
  stage: LeadStage | null;
  /** Só em objeção: frases da paciente que fazem o painel destacar este script. */
  triggers: string[];
  content: string;
  /** Ativo = aparece no painel. Um momento pode ter vários passos ativos. */
  isActive: boolean;
  /** Ordem do passo dentro do momento (menor primeiro). */
  position: number;
  /** Variação por procedimento (ex.: "Botox"). null = passo geral. */
  trilha: string | null;
  createdAt: string;
}

export type ScriptInput = Pick<Script, "name" | "moment" | "content" | "isActive" | "triggers">
  & { position?: number; trilha?: string | null };

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
  createScript: (s: ScriptInput) => Promise<Script | null>;
  updateScript: (id: string, updates: Partial<ScriptInput>) => Promise<void>;
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
  id: r.id, name: r.name,
  // Sem a coluna `moment` (migration 20260929120000 ainda não aplicada), deriva da etapa.
  moment: (r.moment as ScriptMoment) ?? legacyMomentFromStage(r.stage),
  stage: r.stage ?? null,
  triggers: Array.isArray(r.triggers) ? r.triggers : [],
  content: r.content,
  isActive: r.is_active,
  // Sem a coluna `position` (migration 20260930120000 ainda não aplicada), tudo empata em 0.
  position: typeof r.position === "number" ? r.position : 0,
  trilha: typeof r.trilha === "string" && r.trilha.trim() ? r.trilha.trim() : null,
  createdAt: r.created_at,
});

const cleanTrilha = (t: string | null | undefined) => (t && t.trim()) || null;

/** Frases de gatilho limpas: sem vazias, sem espaços nas pontas, sem repetição. */
const cleanTriggers = (list: string[] | undefined) =>
  Array.from(new Set((list ?? []).map(t => t.trim()).filter(Boolean)));

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
    // Sem ordem informada, o passo novo entra no fim do momento.
    const position = s.position ?? nextPosition(scripts, s.moment);
    const { data } = await supabase.from("scripts").insert({
      company_id: activeCompanyId, name: s.name,
      moment: s.moment, stage: homeStageOf(s.moment),
      triggers: s.moment === "objecao" ? cleanTriggers(s.triggers) : [],
      content: s.content, is_active: s.isActive, position,
      trilha: s.moment === "objecao" ? null : cleanTrilha(s.trilha),
    }).select().single();
    if (!data) return null;
    const sc = rowToScript(data);
    setScripts(prev => [sc, ...prev]);
    return sc;
  }, [activeCompanyId, scripts]);

  const updateScript: Ctx["updateScript"] = useCallback(async (id, updates) => {
    const current = scripts.find(s => s.id === id);
    const moment = updates.moment ?? current?.moment;
    const patch: Partial<Script> = { ...updates };
    const dbUp: any = {};
    if (updates.name !== undefined) dbUp.name = updates.name;
    if (updates.moment !== undefined) {
      // Momento e etapa legada andam juntos: o gatilho do banco só recalcula
      // `moment` quando o código antigo muda `stage` sozinho.
      dbUp.moment = updates.moment;
      dbUp.stage = homeStageOf(updates.moment);
      patch.stage = homeStageOf(updates.moment);
    }
    if (updates.triggers !== undefined || updates.moment !== undefined) {
      const triggers = moment === "objecao" ? cleanTriggers(updates.triggers ?? current?.triggers) : [];
      dbUp.triggers = triggers;
      patch.triggers = triggers;
    }
    if (updates.content !== undefined) dbUp.content = updates.content;
    if (updates.isActive !== undefined) dbUp.is_active = updates.isActive;
    if (updates.position !== undefined) dbUp.position = updates.position;
    if (updates.trilha !== undefined || updates.moment !== undefined) {
      const trilha = moment === "objecao" ? null : cleanTrilha(updates.trilha ?? current?.trilha);
      dbUp.trilha = trilha;
      patch.trilha = trilha;
    }
    await supabase.from("scripts").update(dbUp).eq("id", id);
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, [scripts]);

  const deleteScript: Ctx["deleteScript"] = useCallback(async (id) => {
    await supabase.from("scripts").delete().eq("id", id);
    setScripts(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleScriptActive: Ctx["toggleScriptActive"] = useCallback(async (id, active) => {
    await supabase.from("scripts").update({ is_active: active }).eq("id", id);
    setScripts(prev => prev.map(s => s.id === id ? { ...s, isActive: active } : s));
  }, []);

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
