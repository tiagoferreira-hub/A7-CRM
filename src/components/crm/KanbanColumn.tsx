import React from "react";
import { Lead, LeadStage, STAGE_LABELS } from "@/types/lead";
import { useLeads } from "@/context/LeadsContext";
import LeadCard from "./LeadCard";

interface KanbanColumnProps {
  stage: LeadStage;
  leads: Lead[];
  onOpenDetail: (lead: Lead) => void;
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

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, leads, onOpenDetail }) => {
  const { moveLead } = useLeads();

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
    if (leadId) moveLead(leadId, stage);
  };

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[300px] rounded-xl bg-crm-column-bg transition-all"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <div className={`w-2 h-2 rounded-full ${stageColors[stage]}`} />
        <h3 className="text-sm font-semibold text-foreground">{STAGE_LABELS[stage]}</h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-background rounded-full px-2 py-0.5">
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
