export type FollowUpStatus = "pendente" | "concluido" | "atrasado";

export interface FollowUp {
  id: string;
  leadId: string;
  assignedTo: string | null;
  scheduledAt: string;
  notes: string;
  status: FollowUpStatus;
  completedAt: string | null;
  createdAt: string;
}

export type CampaignChannel = "whatsapp" | "email";
export type CampaignStatus = "agendado" | "pausado" | "ativo" | "concluido";

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentCount: number;
  repliedCount: number;
  payload: { message?: string; recipients?: string } & Record<string, any>;
}

export const CAMPAIGN_CHANNEL_LABELS: Record<CampaignChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  agendado: "Agendado",
  pausado: "Pausado",
  ativo: "Ativo",
  concluido: "Concluído",
};

export const LOSS_REASON_OPTIONS = [
  "sem_interesse",
  "sem_orcamento",
  "nao_respondeu",
  "concorrente",
  "fora_perfil",
  "outro",
] as const;

export type LossReason = (typeof LOSS_REASON_OPTIONS)[number];

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  sem_interesse: "Sem interesse",
  sem_orcamento: "Sem orçamento",
  nao_respondeu: "Não respondeu",
  concorrente: "Concorrente",
  fora_perfil: "Fora do perfil",
  outro: "Outro",
};

export interface LeadTag {
  id: string;
  name: string;
  color: string;
}

export interface LeadHistoryEvent {
  id: string;
  leadId: string;
  eventType: string;
  actorId: string | null;
  payload: any;
  createdAt: string;
}

export type FlowTriggerType = "no_reply_days" | "stage_changed" | "lead_created";
export type FlowStatus = "rascunho" | "ativo" | "pausado";
export type FlowActionType = "send_whatsapp" | "send_email" | "create_task" | "change_stage" | "assign" | "notify";

export interface AutomationFlow {
  id: string;
  name: string;
  triggerType: FlowTriggerType;
  triggerConfig: any;
  status: FlowStatus;
  createdAt: string;
}

export interface AutomationFlowStep {
  id: string;
  flowId: string;
  orderIndex: number;
  delayMinutes: number;
  actionType: FlowActionType;
  actionConfig: any;
}

export const FLOW_TRIGGER_LABELS: Record<FlowTriggerType, string> = {
  no_reply_days: "Cliente sem responder (dias)",
  stage_changed: "Mudança de etapa",
  lead_created: "Novo lead criado",
};

export const FLOW_STATUS_LABELS: Record<FlowStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  pausado: "Pausado",
};

export const FLOW_ACTION_LABELS: Record<FlowActionType, string> = {
  send_whatsapp: "Enviar WhatsApp",
  send_email: "Enviar e-mail",
  create_task: "Criar tarefa",
  change_stage: "Alterar etapa",
  assign: "Atribuir responsável",
  notify: "Notificar vendedor",
};
