export type FollowupChannel = "mensagem" | "retorno_presencial" | "tarefa" | "avaliacao";

export interface ProcedureFollowup {
  id: string;
  procedureId: string;
  offsetDays: number;        // dias após o procedimento
  title: string;
  channel: FollowupChannel;
  messageTemplate: string;
  orderIndex: number;
}

export interface Procedure {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;             // custo/preço
  workMinutes: number;       // tempo de trabalho
  isRecurring: boolean;      // plano recorrente
  recurrenceDays: number | null; // intervalo de recall
  indications: string;
  contraindications: string;
  relevantInfo: string;
  active: boolean;
  followups: ProcedureFollowup[];
}

export const FOLLOWUP_CHANNEL_LABELS: Record<FollowupChannel, string> = {
  mensagem: "Mensagem",
  retorno_presencial: "Retorno presencial",
  tarefa: "Tarefa interna",
  avaliacao: "Avaliação/NPS",
};

export const FOLLOWUP_CHANNEL_OPTIONS: FollowupChannel[] = [
  "mensagem", "retorno_presencial", "tarefa", "avaliacao",
];
