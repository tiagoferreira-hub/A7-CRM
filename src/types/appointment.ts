export type AppointmentType =
  | "avaliacao"
  | "consulta"
  | "reuniao"
  | "procedimento"
  | "retorno"
  | "outro";

export type AppointmentStatus =
  | "agendado"
  | "compareceu"
  | "nao_compareceu"
  | "remarcado"
  | "cancelado";

export interface Appointment {
  id: string;
  leadId: string;
  assignedTo: string | null;
  scheduledAt: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
}

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  avaliacao: "Avaliação",
  consulta: "Consulta",
  reuniao: "Reunião",
  procedimento: "Procedimento",
  retorno: "Retorno",
  outro: "Outro",
};

export const APPOINTMENT_TYPE_OPTIONS: AppointmentType[] = [
  "avaliacao", "consulta", "reuniao", "procedimento", "retorno", "outro",
];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  compareceu: "Compareceu",
  nao_compareceu: "Não compareceu",
  remarcado: "Remarcado",
  cancelado: "Cancelado",
};

export const APPOINTMENT_STATUS_OPTIONS: AppointmentStatus[] = [
  "agendado", "compareceu", "nao_compareceu", "remarcado", "cancelado",
];
