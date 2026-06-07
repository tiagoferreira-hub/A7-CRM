// D2 — Cartão de Reativação personalizada pelo procedimento de interesse.
// Aparece na ficha do lead quando ele está em lead_frio, perdido ou há muito sem resposta.
// Sugere mensagens personalizadas com o procedimento de interesse do lead.
import React, { useState } from "react";
import { Lead } from "@/types/lead";
import { useProcedures } from "@/context/ProceduresContext";
import { useLeads } from "@/context/LeadsContext";
import { toast } from "sonner";
import { Flame, Copy, ChevronDown, ChevronUp, Stethoscope } from "lucide-react";

interface Props {
  lead: Lead;
}

const REACTIVATION_TEMPLATES = [
  {
    label: "Condição especial",
    message: (nome: string, proc: string) =>
      `Oi ${nome}! 💚 Vi que você se interessou por ${proc}. Tenho uma condição especial só pra você retornar — posso te mandar os detalhes?`,
  },
  {
    label: "Resultado de clientes",
    message: (nome: string, proc: string) =>
      `Oi ${nome}! Nossos clientes estão adorando os resultados com ${proc} 🌟 Quer agendar uma avaliação sem compromisso?`,
  },
  {
    label: "Retomar conversa",
    message: (nome: string, proc: string) =>
      `Oi ${nome}, tudo bem? Lembro que você se interessou por ${proc}. Passando para saber se ainda posso te ajudar 😊`,
  },
  {
    label: "Novidade / promoção",
    message: (nome: string, proc: string) =>
      `${nome}, temos uma novidade em ${proc} que você vai gostar! Posso te explicar em 2 minutinhos? 💬`,
  },
];

const COLD_STAGES: Lead["stage"][] = ["lead_frio", "perdido"];

const ReactivationCard: React.FC<Props> = ({ lead }) => {
  const { procedures } = useProcedures();
  const { updateLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [savingInterest, setSavingInterest] = useState(false);

  const isCold = COLD_STAGES.includes(lead.stage);
  const procedure = procedures.find((p) => p.id === lead.procedureInterestId);
  const activeProcedures = procedures.filter((p) => p.active);

  const handleCopyMessage = async (msg: string) => {
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("Mensagem copiada!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleSetInterest = async (procId: string) => {
    setSavingInterest(true);
    await updateLead(lead.id, { procedureInterestId: procId || null } as any);
    setSavingInterest(false);
    toast.success(procId ? "Procedimento de interesse salvo!" : "Interesse removido.");
  };

  // Só mostra o card se o lead estiver frio/perdido OU se já tem interesse definido
  if (!isCold && !lead.procedureInterestId) return null;

  return (
    <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Reativação personalizada
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {procedure ? `Interesse: ${procedure.name}` : "Defina o procedimento de interesse"}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-amber-600 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-600 shrink-0" />
        )}
      </button>

      {open && (
        <div className="space-y-3 pt-1">
          {/* Seletor de procedimento de interesse */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
              <Stethoscope className="h-3.5 w-3.5" /> Procedimento de interesse
            </label>
            <select
              value={lead.procedureInterestId ?? ""}
              disabled={savingInterest}
              onChange={(e) => handleSetInterest(e.target.value)}
              className="w-full rounded-lg border bg-white dark:bg-background px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <option value="">— Nenhum —</option>
              {activeProcedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mensagens sugeridas */}
          {procedure && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Mensagens sugeridas para {procedure.name}:
              </p>
              {REACTIVATION_TEMPLATES.map((tpl) => {
                const msg = tpl.message(lead.name.split(" ")[0], procedure.name);
                return (
                  <div
                    key={tpl.label}
                    className="rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-background p-2.5 space-y-1"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      {tpl.label}
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">{msg}</p>
                    <button
                      onClick={() => handleCopyMessage(msg)}
                      className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReactivationCard;
