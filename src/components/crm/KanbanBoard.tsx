import React, { useState, useMemo } from "react";
import { useLeads } from "@/context/LeadsContext";
import { Lead, LeadOrigin, LeadStage, STAGE_ORDER, ORIGIN_LABELS, ORIGIN_OPTIONS, STAGE_LABELS } from "@/types/lead";
import KanbanColumn from "./KanbanColumn";
import LeadDetailModal from "./LeadDetailModal";
import NewLeadModal from "./NewLeadModal";
import { Search, Plus, Filter } from "lucide-react";

const KanbanBoard: React.FC = () => {
  const { leads } = useLeads();
  const [search, setSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<LeadOrigin | "">("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        if (!l.phone.toLowerCase().includes(q) && !l.name.toLowerCase().includes(q)) return false;
      }
      if (filterOrigin && l.origin !== filterOrigin) return false;
      if (filterStage && l.stage !== filterStage) return false;
      return true;
    });
  }, [leads, search, filterOrigin, filterStage]);

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
        <div className="flex items-center gap-3 px-6 py-3 bg-card border-b border-border">
          <select
            className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value as LeadOrigin | "")}
          >
            <option value="">Todas as origens</option>
            {ORIGIN_OPTIONS.map((o) => (
              <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>
            ))}
          </select>
          <select
            className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value as LeadStage | "")}
          >
            <option value="">Todas as etapas</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          {(filterOrigin || filterStage) && (
            <button
              onClick={() => { setFilterOrigin(""); setFilterStage(""); }}
              className="text-xs text-primary hover:underline"
            >
              Limpar filtros
            </button>
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
    </div>
  );
};

export default KanbanBoard;
