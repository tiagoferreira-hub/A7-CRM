export type LeadStage =
  | "lead_entrou"
  | "hot_lead"
  | "agendado"
  | "compareceu"
  | "fechou"
  | "lead_frio"
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
  services: string[];
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
  lossReason?: string | null;
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  lead_entrou: "🆕 Novo Lead",
  hot_lead: "🔥 Lead Quente",
  agendado: "📅 Agendado",
  compareceu: "✅ Compareceu",
  fechou: "💰 Fechou",
  lead_frio: "🧊 Lead Frio",
  perdido: "❌ Perdido",
};

// Visible/active lifecycle stages (Kanban order)
export const STAGE_ORDER: LeadStage[] = [
  "lead_entrou",
  "hot_lead",
  "agendado",
  "compareceu",
  "fechou",
  "lead_frio",
];

export const STAGE_ALL: LeadStage[] = [
  "lead_entrou",
  "hot_lead",
  "agendado",
  "compareceu",
  "fechou",
  "lead_frio",
  "perdido",
];

// Groups for the stage dropdown (Respond.io style)
export const LIFECYCLE_STAGES: LeadStage[] = [
  "lead_entrou",
  "hot_lead",
  "agendado",
  "compareceu",
  "fechou",
];

export const LOSS_STAGES: LeadStage[] = ["lead_frio"];

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
