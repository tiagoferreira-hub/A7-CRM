import React, { useState } from "react";
import { useKeywordRules } from "@/context/KeywordRulesContext";
import { KeywordMatchType } from "@/lib/keywordMatcher";
import { LeadStage, STAGE_ALL, STAGE_LABELS } from "@/types/lead";
import { Plus, Trash2, Sparkles } from "lucide-react";

const MATCH_LABELS: Record<KeywordMatchType, string> = {
  contains: "Contém",
  exact: "Exata",
  regex: "Regex",
};
const MATCH_OPTIONS: KeywordMatchType[] = ["contains", "exact", "regex"];

const KeywordRulesSettings: React.FC = () => {
  const { rules, addRule, updateRule, deleteRule, seedExamples } = useKeywordRules();
  const [keyword, setKeyword] = useState("");
  const [matchType, setMatchType] = useState<KeywordMatchType>("contains");
  const [targetStage, setTargetStage] = useState<LeadStage>("agendado");
  const [priority, setPriority] = useState(100);

  const handleAdd = () => {
    const k = keyword.trim();
    if (!k) return;
    addRule({ keyword: k, matchType, targetStage, priority, active: true, allowBackward: false });
    setKeyword("");
    setPriority(100);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-base font-semibold text-foreground">Regras de palavra-chave</h3>
        {rules.length === 0 && (
          <button
            onClick={seedExamples}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Adicionar exemplos
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Quando uma mensagem da conversa contém a palavra-chave, o lead muda de etapa
        automaticamente. As regras são avaliadas por prioridade (menor primeiro); vale a 1ª que casar.
      </p>

      {/* Adicionar nova regra */}
      <div className="flex flex-wrap items-end gap-2 mb-6">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] text-muted-foreground mb-1">Palavra-chave</label>
          <input
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="ex.: agendamento marcado"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Tipo</label>
          <select
            className="text-sm border border-input rounded-lg px-2 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as KeywordMatchType)}
          >
            {MATCH_OPTIONS.map((m) => <option key={m} value={m}>{MATCH_LABELS[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Etapa-alvo</label>
          <select
            className="text-sm border border-input rounded-lg px-2 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={targetStage}
            onChange={(e) => setTargetStage(e.target.value as LeadStage)}
          >
            {STAGE_ALL.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="w-20">
          <label className="block text-[11px] text-muted-foreground mb-1">Prioridade</label>
          <input
            type="number"
            className="w-full text-sm border border-input rounded-lg px-2 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) || 0)}
          />
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {/* Lista de regras */}
      <div className="space-y-1">
        {rules.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group"
          >
            <span className="text-sm font-medium text-foreground flex-1 min-w-[140px] truncate" title={r.keyword}>
              "{r.keyword}"
            </span>
            <span className="text-xs text-muted-foreground">{MATCH_LABELS[r.matchType]}</span>
            <span className="text-xs">→</span>
            <select
              className="text-xs border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={r.targetStage}
              onChange={(e) => updateRule(r.id, { targetStage: e.target.value as LeadStage })}
            >
              {STAGE_ALL.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <input
              type="number"
              className="w-16 text-xs border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={r.priority}
              onChange={(e) => updateRule(r.id, { priority: Number(e.target.value) || 0 })}
              title="Prioridade (menor avalia primeiro)"
            />
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer" title="Permitir retrocesso de etapa">
              <input
                type="checkbox"
                checked={r.allowBackward}
                onChange={(e) => updateRule(r.id, { allowBackward: e.target.checked })}
              />
              retrocede
            </label>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={r.active}
                onChange={(e) => updateRule(r.id, { active: e.target.checked })}
              />
              ativa
            </label>
            <button
              onClick={() => deleteRule(r.id)}
              className="p-1.5 rounded hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma regra cadastrada</p>
        )}
      </div>
    </div>
  );
};

export default KeywordRulesSettings;
