import React, { useState } from "react";
import { useProcedures } from "@/context/ProceduresContext";
import ProcedureModal from "@/components/crm/ProcedureModal";
import { Stethoscope, Plus, Clock, Repeat, CalendarClock } from "lucide-react";

const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Procedimentos: React.FC = () => {
  const { procedures } = useProcedures();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openNew = () => { setEditingId(null); setOpen(true); };
  const openEdit = (id: string) => { setEditingId(id); setOpen(true); };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Catálogo de Procedimentos</h2>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" /> Novo procedimento
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {procedures.length === 0 ? (
          <div className="max-w-md mx-auto text-center border border-dashed border-border rounded-xl p-12 bg-card mt-8">
            <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhum procedimento cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre seus procedimentos com custos, indicações e o cronograma pós-procedimento. Isso vira a base do pós-operatório automático.
            </p>
            <button onClick={openNew} className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4" /> Criar o primeiro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {procedures.map((p) => (
              <button key={p.id} onClick={() => openEdit(p.id)}
                className="text-left bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                  {!p.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">inativo</span>}
                </div>
                {p.category && <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>}
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                  <span className="font-semibold text-primary">{fmtMoney(p.price)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.workMinutes}min</span>
                  {p.isRecurring && (
                    <span className="flex items-center gap-1 text-crm-purple"><Repeat className="w-3 h-3" />{p.recurrenceDays ? `${p.recurrenceDays}d` : "recorrente"}</span>
                  )}
                  {p.followups.length > 0 && (
                    <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{p.followups.length} toques</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ProcedureModal open={open} onClose={() => setOpen(false)} procedureId={editingId} onCreated={(id) => setEditingId(id)} />
    </div>
  );
};

export default Procedimentos;
