import React, { useState } from "react";
import { Lead, ORIGIN_LABELS, LeadStage, CHANNEL_LABELS } from "@/types/lead";
import { useLeads } from "@/context/LeadsContext";
import { useTags } from "@/context/TagsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import StageStepper from "./StageStepper";
import ServiceBadges from "./ServiceBadges";
import { useConversations } from "@/context/ConversationsContext";
import { useWaitingTime, waitingTierClasses } from "@/hooks/useWaitingTime";
import { Phone, MessageSquare, Pencil, Check, X, User, Clock } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onOpenDetail: (lead: Lead) => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const originColors: Record<string, string> = {
  manual: "bg-muted text-muted-foreground",
  bio_instagram: "bg-crm-purple-light text-crm-purple",
  anuncio: "bg-crm-info-light text-crm-info",
  outro: "bg-crm-warning-light text-crm-warning",
};

const channelColors: Record<string, string> = {
  whatsapp: "bg-crm-success-light text-crm-success",
  instagram: "bg-crm-purple-light text-crm-purple",
  messenger: "bg-crm-info-light text-crm-info",
  tiktok: "bg-foreground/10 text-foreground",
  site: "bg-crm-info-light text-crm-info",
  indicacao: "bg-crm-warning-light text-crm-warning",
  ads: "bg-crm-info-light text-crm-info",
  manual: "bg-muted text-muted-foreground",
};

const LeadCard: React.FC<LeadCardProps> = ({ lead, onOpenDetail }) => {
  const { updateLead, moveLead } = useLeads();
  const { tagsForLead } = useTags();
  const { conversations } = useConversations();
  const members = useCompanyMembers();
  const assignee = lead.assignedTo ? members.find(m => m.userId === lead.assignedTo) : null;
  const leadTags = tagsForLead(lead.id);
  const services = lead.services ?? (lead.service ? [lead.service] : []);
  const conv = conversations.find(c => c.leadId === lead.id);
  const awaiting = !!conv?.awaitingReply && conv.status === "open";
  const waiting = useWaitingTime(awaiting ? (conv?.lastMessageAt ?? lead.lastInteraction) : null);
  const waitTier = waiting ? waitingTierClasses[waiting.tier] : null;
  const [editing, setEditing] = useState(false);
  const [editServices, setEditServices] = useState<string[]>(services);
  const [editValue, setEditValue] = useState(lead.value.toString());

  const handleSave = () => {
    updateLead(lead.id, {
      services: editServices,
      value: parseFloat(editValue.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
    } as any);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditServices(services);
    setEditValue(lead.value.toString());
    setEditing(false);
  };

  return (
    <div
      className="group rounded-lg border border-border bg-card p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => !editing && onOpenDetail(lead)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-foreground leading-tight truncate pr-2">
          {lead.name}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(!editing);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Phone className="w-3 h-3" />
        <span>{lead.phone}</span>
      </div>

      <div className="mb-2" onClick={(e) => e.stopPropagation()}>
        <StageStepper
          value={lead.stage}
          size="sm"
          onChange={(s) => moveLead(lead.id, s)}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${originColors[lead.origin] ?? "bg-muted text-muted-foreground"}`}>
          {ORIGIN_LABELS[lead.origin]}
        </span>
        {lead.channel && lead.channel !== "manual" && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${channelColors[lead.channel] ?? "bg-muted text-muted-foreground"}`}>
            {CHANNEL_LABELS[lead.channel]}
          </span>
        )}
        {leadTags.map(t => (
          <span key={t.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
            {t.name}
          </span>
        ))}
        {assignee ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground" title={assignee.displayName}>
            <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
              {assignee.displayName.charAt(0).toUpperCase()}
            </span>
          </span>
        ) : (
          <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />—</span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
          <ServiceBadges value={editServices} onChange={setEditServices} size="xs" />
          <input
            className="w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Valor (R$)"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
            >
              <Check className="w-3 h-3" /> Salvar
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-accent"
            >
              <X className="w-3 h-3" /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {services.length > 0 ? (
            <ServiceBadges value={services} size="xs" readOnly />
          ) : (
            <div className="text-xs text-muted-foreground italic">Sem serviço</div>
          )}
          <div className="text-base font-bold text-primary mt-1">
            {formatCurrency(lead.value)}
          </div>
        </>
      )}

      <div className="flex items-start gap-1.5 mt-2 text-[11px] text-muted-foreground">
        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
        <span className="line-clamp-2">{lead.lastMessage}</span>
      </div>

      {waiting && waitTier && (
        <div className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${waitTier.bg} ${waitTier.text}`}>
          <Clock className="w-3 h-3" />
          {waiting.label}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground mt-1.5 text-right">
        {formatDate(lead.lastInteraction)}
      </div>
    </div>
  );
};

export default LeadCard;
