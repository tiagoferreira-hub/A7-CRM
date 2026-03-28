export type LeadStage =
  | "lead_entrou"
  | "em_atendimento"
  | "qualificado"
  | "agendado"
  | "compareceu"
  | "fechou"
  | "sem_resposta"
  | "perdido";

export type LeadOrigin = "manual" | "bio_instagram" | "anuncio" | "outro";

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
  anuncio: "Anúncio",
  outro: "Outro",
};

export const ORIGIN_OPTIONS: LeadOrigin[] = ["manual", "bio_instagram", "anuncio", "outro"];
