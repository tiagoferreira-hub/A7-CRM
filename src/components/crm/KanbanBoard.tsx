import React, { useState, useMemo } from "react";
import { useLeads } from "@/context/LeadsContext";
import { useTags } from "@/context/TagsContext";
import { useFollowUps } from "@/context/FollowUpsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { Lead, LeadOrigin, LeadStage, STAGE_ORDER, ORIGIN_LABELS, ORIGIN_OPTIONS, STAGE_LABELS } from "@/types/lead";
import KanbanColumn from "./KanbanColumn";
import LeadDetailModal from "./LeadDetailModal";
import NewLeadModal from "./NewLeadModal";
import LossReasonModal from "./LossReasonModal";
import { Search, Plus, Filter } from "lucide-react";

const KanbanBoard: React.FC = () => {
  const { leads, moveLead } = useLeads();
  const { tags, assignments } = useTags();
  const { followUps } = useFollowUps();
  const members = useCompanyMembers();
  const [search, setSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<LeadOrigin | "">("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [filterPendingFup, setFilterPendingFup] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pendingLoss, setPendingLoss] = useState<{ leadId: string; stage: LeadStage } | null>(null);

  const leadsWithPendingFup = useMemo(() => new Set(
    followUps.filter(f => f.status !== "concluido").map(f => f.leadId)
  ), [followUps]);

  const tagsByLead = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    assignments.forEach(a => {
      if (!map[a.leadId]) map[a.leadId] = new Set();
      map[a.leadId].add(a.tagId);
    });
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        if (!l.phone.toLowerCase().includes(q) && !l.name.toLowerCase().includes(q)) return false;
      }
      if (filterOrigin && l.origin !== filterOrigin) return false;
      if (filterStage && l.stage !== filterStage) return false;
      if (filterAssignee === "__none__" && l.assignedTo) return false;
      if (filterAssignee && filterAssignee !== "__none__" && l.assignedTo !== filterAssignee) return false;
      if (filterTag && !(tagsByLead[l.id]?.has(filterTag))) return false;
      if (filterPendingFup && !leadsWithPendingFup.has(l.id)) return false;
      return true;
    });
  }, [leads, search, filterOrigin, filterStage, filterAssignee, filterTag, filterPendingFup, tagsByLead, leadsWithPendingFup]);

  const leadsByStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {} as any;
    STAGE_ORDER.forEach((s) => (map[s] = []));
    filtered.forEach((l) => map[l.stage]?.push(l));
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Buscar por telefone ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
            showFilters || filterOrigin || filterStage
              ? "border-primary bg-crm-info-light text-primary"
              : "border-input text-muted-foreground hover:bg-accent"
          }`}
        >
          <Filter className="w-4 h-4" /> Filtros
        </button>

        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap px-6 py-3 bg-card border-b border-border">
          <select className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value as LeadOrigin | "")}>
            <option value="">Todas as origens</option>
            {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>)}
          </select>
          <select className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={filterStage} onChange={(e) => setFilterStage(e.target.value as LeadStage | "")}>
            <option value="">Todas as etapas</option>
            {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <select className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            <option value="__none__">Sem responsável</option>
            {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
          </select>
          <select className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
            <option value="">Todas as tags</option>
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={filterPendingFup} onChange={e => setFilterPendingFup(e.target.checked)} />
            Follow-up pendente
          </label>
          {(filterOrigin || filterStage || filterAssignee || filterTag || filterPendingFup) && (
            <button onClick={() => { setFilterOrigin(""); setFilterStage(""); setFilterAssignee(""); setFilterTag(""); setFilterPendingFup(false); }}
              className="text-xs text-primary hover:underline">Limpar filtros</button>
          )}
        </div>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto px-4 py-4">
        <div className="flex gap-3 min-w-max">
          {STAGE_ORDER.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={leadsByStage[stage]}
              onOpenDetail={setSelectedLead}
              onDropLead={(leadId, s) => {
                if (s === "lead_frio" || s === "perdido") setPendingLoss({ leadId, stage: s });
                else moveLead(leadId, s);
              }}
            />
          ))}
        </div>
      </div>

      <LeadDetailModal
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <LossReasonModal
        open={!!pendingLoss}
        onClose={() => setPendingLoss(null)}
        onConfirm={(reason) => { if (pendingLoss) moveLead(pendingLoss.leadId, pendingLoss.stage, reason); setPendingLoss(null); }}
      />
    </div>
  );
};

export default KanbanBoard;
