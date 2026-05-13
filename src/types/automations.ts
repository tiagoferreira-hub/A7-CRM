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
