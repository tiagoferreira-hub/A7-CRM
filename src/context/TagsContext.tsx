import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { LeadTag } from "@/types/automations";

interface Assignment { id: string; leadId: string; tagId: string; }

interface Ctx {
  tags: LeadTag[];
  assignments: Assignment[];
  createTag: (name: string, color?: string) => Promise<LeadTag | null>;
  assignTag: (leadId: string, tagId: string) => Promise<void>;
  unassignTag: (leadId: string, tagId: string) => Promise<void>;
  tagsForLead: (leadId: string) => LeadTag[];
}

const TagsContext = createContext<Ctx | null>(null);
export const useTags = () => {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error("useTags must be used within TagsProvider");
  return ctx;
};

export const TagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useAuth();
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const reload = useCallback(async () => {
    if (!activeCompanyId) { setTags([]); setAssignments([]); return; }
    const [{ data: t }, { data: a }] = await Promise.all([
      (supabase as any).from("lead_tags").select("*").eq("company_id", activeCompanyId).order("name"),
      (supabase as any).from("lead_tag_assignments").select("*").eq("company_id", activeCompanyId),
    ]);
    setTags((t ?? []).map((r: any) => ({ id: r.id, name: r.name, color: r.color })));
    setAssignments((a ?? []).map((r: any) => ({ id: r.id, leadId: r.lead_id, tagId: r.tag_id })));
  }, [activeCompanyId]);

  useEffect(() => { reload(); }, [reload]);

  const createTag = useCallback(async (name: string, color = "#6366f1") => {
    if (!activeCompanyId || !name.trim()) return null;
    const { data } = await (supabase as any).from("lead_tags").insert({
      company_id: activeCompanyId, name: name.trim(), color,
    }).select().single();
    if (data) {
      const t = { id: data.id, name: data.name, color: data.color };
      setTags(prev => [...prev, t]);
      return t;
    }
    return null;
  }, [activeCompanyId]);

  const assignTag = useCallback(async (leadId: string, tagId: string) => {
    if (!activeCompanyId) return;
    const { data } = await (supabase as any).from("lead_tag_assignments").insert({
      company_id: activeCompanyId, lead_id: leadId, tag_id: tagId,
    }).select().single();
    if (data) setAssignments(prev => [...prev, { id: data.id, leadId, tagId }]);
  }, [activeCompanyId]);

  const unassignTag = useCallback(async (leadId: string, tagId: string) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("lead_tag_assignments").delete()
      .eq("company_id", activeCompanyId).eq("lead_id", leadId).eq("tag_id", tagId);
    setAssignments(prev => prev.filter(a => !(a.leadId === leadId && a.tagId === tagId)));
  }, [activeCompanyId]);

  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const tagsForLead = useCallback((leadId: string) =>
    assignments.filter(a => a.leadId === leadId).map(a => tagMap[a.tagId]).filter(Boolean) as LeadTag[],
    [assignments, tagMap]);

  return <TagsContext.Provider value={{ tags, assignments, createTag, assignTag, unassignTag, tagsForLead }}>{children}</TagsContext.Provider>;
};
