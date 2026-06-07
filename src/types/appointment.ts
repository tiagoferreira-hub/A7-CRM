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
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
  procedureId?: string | null;
}

export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 h" },
  { value: 90, label: "1 h 30" },
  { value: 120, label: "2 h" },
];

// Status que indicam que o horário está livre/encerrado (não ocupam a agenda ativa)
export const INACTIVE_STATUSES: AppointmentStatus[] = ["cancelado", "nao_compareceu"];

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
