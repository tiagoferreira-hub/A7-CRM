import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { LeadStage } from "@/types/lead";
import { KeywordRule, KeywordMatchType } from "@/lib/keywordMatcher";

interface KeywordRulesContextType {
  rules: KeywordRule[];
  loading: boolean;
  addRule: (rule: Omit<KeywordRule, "id">) => Promise<void>;
  updateRule: (id: string, updates: Partial<Omit<KeywordRule, "id">>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  seedExamples: () => Promise<void>;
}

const KeywordRulesContext = createContext<KeywordRulesContextType | null>(null);

export const useKeywordRules = () => {
  const ctx = useContext(KeywordRulesContext);
  if (!ctx) throw new Error("useKeywordRules must be used within KeywordRulesProvider");
  return ctx;
};

const rowToRule = (r: any): KeywordRule => ({
  id: r.id,
  keyword: r.keyword,
  matchType: (r.match_type as KeywordMatchType) ?? "contains",
  targetStage: r.target_stage as LeadStage,
  priority: Number(r.priority ?? 100),
  active: r.active ?? true,
  allowBackward: r.allow_backward ?? false,
});

const ruleToRow = (r: Partial<Omit<KeywordRule, "id">>): any => {
  const row: any = {};
  if (r.keyword !== undefined) row.keyword = r.keyword;
  if (r.matchType !== undefined) row.match_type = r.matchType;
  if (r.targetStage !== undefined) row.target_stage = r.targetStage;
  if (r.priority !== undefined) row.priority = r.priority;
  if (r.active !== undefined) row.active = r.active;
  if (r.allowBackward !== undefined) row.allow_backward = r.allowBackward;
  return row;
};

// Exemplos prontos (mesmos do seed da migration) para companies sem regras.
const EXAMPLE_RULES: Omit<KeywordRule, "id">[] = [
  { keyword: "agendamento marcado", matchType: "contains", targetStage: "agendado", priority: 10, active: true, allowBackward: false },
  { keyword: "agendado", matchType: "contains", targetStage: "agendado", priority: 20, active: true, allowBackward: false },
  { keyword: "fechou", matchType: "contains", targetStage: "fechou", priority: 10, active: true, allowBackward: false },
  { keyword: "fechado", matchType: "contains", targetStage: "fechou", priority: 20, active: true, allowBackward: false },
  { keyword: "pacote", matchType: "contains", targetStage: "fechou", priority: 30, active: true, allowBackward: false },
  { keyword: "não tenho interesse", matchType: "contains", targetStage: "lead_frio", priority: 10, active: true, allowBackward: false },
  { keyword: "depois", matchType: "contains", targetStage: "lead_frio", priority: 90, active: true, allowBackward: false },
];

export const KeywordRulesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useAuth();
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) { setRules([]); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("keyword_rules")
      .select("*")
      .eq("company_id", activeCompanyId)
      .order("priority", { ascending: true });
    setRules((data ?? []).map(rowToRule));
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const addRule = useCallback(async (rule: Omit<KeywordRule, "id">) => {
    if (!activeCompanyId) return;
    const { data } = await (supabase as any)
      .from("keyword_rules")
      .insert({ company_id: activeCompanyId, ...ruleToRow(rule) })
      .select()
      .single();
    if (data) setRules((prev) => [...prev, rowToRule(data)].sort((a, b) => a.priority - b.priority));
  }, [activeCompanyId]);

  const updateRule = useCallback(async (id: string, updates: Partial<Omit<KeywordRule, "id">>) => {
    if (!activeCompanyId) return;
    await (supabase as any)
      .from("keyword_rules")
      .update(ruleToRow(updates))
      .eq("id", id)
      .eq("company_id", activeCompanyId);
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)).sort((a, b) => a.priority - b.priority),
    );
  }, [activeCompanyId]);

  const deleteRule = useCallback(async (id: string) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("keyword_rules").delete().eq("id", id).eq("company_id", activeCompanyId);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, [activeCompanyId]);

  const seedExamples = useCallback(async () => {
    if (!activeCompanyId) return;
    const rows = EXAMPLE_RULES.map((r) => ({ company_id: activeCompanyId, ...ruleToRow(r) }));
    const { data } = await (supabase as any)
      .from("keyword_rules")
      .upsert(rows, { onConflict: "company_id,keyword,match_type", ignoreDuplicates: true })
      .select();
    if (data && data.length) {
      setRules((prev) =>
        [...prev, ...data.map(rowToRule)]
          .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
          .sort((a, b) => a.priority - b.priority),
      );
    } else {
      await load();
    }
  }, [activeCompanyId, load]);

  return (
    <KeywordRulesContext.Provider value={{ rules, loading, addRule, updateRule, deleteRule, seedExamples }}>
      {children}
    </KeywordRulesContext.Provider>
  );
};
