import React from "react";
import { Lead, LeadStage, STAGE_LABELS } from "@/types/lead";
import { useLeads } from "@/context/LeadsContext";
import LeadCard from "./LeadCard";

interface KanbanColumnProps {
  stage: LeadStage;
  leads: Lead[];
  onOpenDetail: (lead: Lead) => void;
  onDropLead?: (leadId: string, stage: LeadStage) => void;
}

const stageColors: Record<LeadStage, string> = {
  lead_entrou: "bg-crm-info",
  em_atendimento: "bg-crm-warning",
  qualificado: "bg-crm-purple",
  agendado: "bg-primary",
  compareceu: "bg-crm-success",
  fechou: "bg-crm-success",
  sem_resposta: "bg-muted-foreground",
  perdido: "bg-crm-danger",
};

const highlightedStages: LeadStage[] = ["qualificado", "agendado"];

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, leads, onOpenDetail, onDropLead }) => {
  const { moveLead } = useLeads();
  const isHighlighted = highlightedStages.includes(stage);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("ring-2", "ring-primary/30");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("ring-2", "ring-primary/30");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-primary/30");
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;
    if (onDropLead) onDropLead(leadId, stage);
    else moveLead(leadId, stage);
  };

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[300px] rounded-xl transition-all ${
        isHighlighted
          ? "bg-primary/[0.04] border border-primary/20"
          : "bg-crm-column-bg"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <div className={`w-2.5 h-2.5 rounded-full ${stageColors[stage]}`} />
        <h3 className="text-sm font-semibold text-foreground">{STAGE_LABELS[stage]}</h3>
        <span className={`ml-auto text-sm font-bold rounded-full px-2.5 py-0.5 ${
          isHighlighted
            ? "bg-primary/10 text-primary"
            : "bg-background text-foreground"
        }`}>
          {leads.length}
        </span>
      </div>
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        {leads.map((lead) => (
          <div
            key={lead.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("leadId", lead.id);
            }}
          >
            <LeadCard lead={lead} onOpenDetail={onOpenDetail} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
