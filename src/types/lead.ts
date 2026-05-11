export type LeadStage =
  | "lead_entrou"
  | "em_atendimento"
  | "qualificado"
  | "agendado"
  | "compareceu"
  | "fechou"
  | "sem_resposta"
  | "perdido";

export type LeadOrigin =
  | "manual"
  | "bio_instagram"
  | "meta"
  | "google_ads"
  | "indicacao"
  | "organico";

export type LeadChannel = "whatsapp" | "instagram" | "manual";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  origin: LeadOrigin;
  stage: LeadStage;
  service: string;
  value: number;
  lastMessage: string;
  lastInteraction: string;
  observations: string;
  createdAt: string;
  assignedTo?: string | null;
  channel?: LeadChannel;
  firstMessage?: string;
  firstInteractionAt?: string | null;
  externalConversationId?: string | null;
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  lead_entrou: "Lead entrou",
  em_atendimento: "Em atendimento",
  qualificado: "Qualificado",
  agendado: "Agendado",
  compareceu: "Compareceu",
  fechou: "Fechou",
  sem_resposta: "Sem resposta",
  perdido: "Perdido",
};

export const STAGE_ORDER: LeadStage[] = [
  "lead_entrou",
  "em_atendimento",
  "qualificado",
  "agendado",
  "compareceu",
  "fechou",
  "sem_resposta",
  "perdido",
];

export const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  manual: "Manual",
  bio_instagram: "Bio Instagram",
  meta: "Meta",
  google_ads: "Google Ads",
  indicacao: "Programa de indicação",
  organico: "Orgânico",
};

export const ORIGIN_OPTIONS: LeadOrigin[] = [
  "manual",
  "bio_instagram",
  "meta",
  "google_ads",
  "indicacao",
  "organico",
];

export const CHANNEL_LABELS: Record<LeadChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  manual: "Manual",
};

export const CHANNEL_OPTIONS: LeadChannel[] = ["whatsapp", "instagram", "manual"];
