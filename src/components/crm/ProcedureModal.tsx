import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProcedures } from "@/context/ProceduresContext";
import { FOLLOWUP_CHANNEL_OPTIONS, FOLLOWUP_CHANNEL_LABELS, FollowupChannel } from "@/types/procedure";
import { Plus, Trash2, CalendarClock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  procedureId: string | null;
  onCreated: (id: string) => void;
}

const inputCls = "w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const labelCls = "text-xs font-medium text-muted-foreground";

const ProcedureModal: React.FC<Props> = ({ open, onClose, procedureId, onCreated }) => {
  const { procedures, addProcedure, updateProcedure, deleteProcedure, addFollowup, updateFollowup, deleteFollowup } = useProcedures();
  const current = procedureId ? procedures.find((p) => p.id === procedureId) ?? null : null;
  const isEdit = !!current;

  const [f, setF] = useState({
    name: "", category: "", price: "", workMinutes: "60",
    isRecurring: false, recurrenceDays: "",
    description: "", indications: "", contraindications: "", relevantInfo: "", active: true,
  });

  useEffect(() => {
    if (!open) return;
    if (current) {
      setF({
        name: current.name, category: current.category, price: String(current.price),
        workMinutes: String(current.workMinutes), isRecurring: current.isRecurring,
        recurrenceDays: current.recurrenceDays != null ? String(current.recurrenceDays) : "",
        description: current.description, indications: current.indications,
        contraindications: current.contraindications, relevantInfo: current.relevantInfo, active: current.active,
      });
    } else {
      setF({ name: "", category: "", price: "", workMinutes: "60", isRecurring: false, recurrenceDays: "", description: "", indications: "", contraindications: "", relevantInfo: "", active: true });
    }
  }, [open, procedureId]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = () => ({
    name: f.name.trim(),
    category: f.category.trim(),
    description: f.description,
    price: parseFloat(f.price.replace(",", ".")) || 0,
    workMinutes: parseInt(f.workMinutes) || 60,
    isRecurring: f.isRecurring,
    recurrenceDays: f.isRecurring && f.recurrenceDays ? parseInt(f.recurrenceDays) : null,
    indications: f.indications,
    contraindications: f.contraindications,
    relevantInfo: f.relevantInfo,
    active: f.active,
  });

  const handleSave = async () => {
    if (!f.name.trim()) return;
    if (current) {
      await updateProcedure(current.id, payload());
      onClose();
    } else {
      const created = await addProcedure(payload());
      if (created) onCreated(created.id); // mantém aberto em modo edição p/ adicionar o cronograma
    }
  };

  const handleDelete = async () => {
    if (current && confirm("Excluir este procedimento e todo o cronograma? Não pode ser desfeito.")) {
      await deleteProcedure(current.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar procedimento" : "Novo procedimento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className={labelCls}>Nome *</label>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Botox / Toxina Botulínica" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Categoria</label>
              <input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Injetável, Facial…" />
            </div>
            <div>
              <label className={labelCls}>Custo / preço (R$)</label>
              <input className={inputCls} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="0,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Tempo de trabalho (min)</label>
              <input type="number" className={inputCls} value={f.workMinutes} onChange={(e) => setF({ ...f, workMinutes: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Recall (dias) {f.isRecurring ? "" : "— ative o plano"}</label>
              <input type="number" className={inputCls} value={f.recurrenceDays} disabled={!f.isRecurring} onChange={(e) => setF({ ...f, recurrenceDays: e.target.value })} placeholder="ex.: 120" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={f.isRecurring} onChange={(e) => setF({ ...f, isRecurring: e.target.checked })} />
            Plano recorrente (gera lembrete de retorno/recompra)
          </label>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea className={inputCls} rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Indicações</label>
              <textarea className={inputCls} rows={2} value={f.indications} onChange={(e) => setF({ ...f, indications: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Contra-indicações</label>
              <textarea className={inputCls} rows={2} value={f.contraindications} onChange={(e) => setF({ ...f, contraindications: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Informações relevantes</label>
            <textarea className={inputCls} rows={2} value={f.relevantInfo} onChange={(e) => setF({ ...f, relevantInfo: e.target.value })} placeholder="Cuidados, materiais, observações…" />
          </div>

          {/* Cronograma pós-procedimento — só após salvar */}
          {isEdit && current && (
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Cronograma pós-procedimento</h4>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Os toques de acompanhamento após realizar o procedimento (ex.: retorno em 7 dias). Vão alimentar a automação de pós-operatório.
              </p>
              <div className="space-y-2">
                {current.followups.map((fu) => (
                  <div key={fu.id} className="rounded-md border border-border p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-16 text-sm border border-input rounded-md px-2 py-1 bg-background" value={fu.offsetDays}
                        onChange={(e) => updateFollowup(fu.id, { offsetDays: parseInt(e.target.value) || 0 })} />
                      <span className="text-xs text-muted-foreground">dias depois</span>
                      <select className="text-xs border border-input rounded-md px-2 py-1 bg-background ml-auto" value={fu.channel}
                        onChange={(e) => updateFollowup(fu.id, { channel: e.target.value as FollowupChannel })}>
                        {FOLLOWUP_CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{FOLLOWUP_CHANNEL_LABELS[c]}</option>)}
                      </select>
                      <button onClick={() => deleteFollowup(fu.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <input className="w-full text-sm border border-input rounded-md px-2 py-1 bg-background" value={fu.title}
                      placeholder="Título (ex.: Retorno para avaliar resultado)" onChange={(e) => updateFollowup(fu.id, { title: e.target.value })} />
                    <textarea className="w-full text-xs border border-input rounded-md px-2 py-1 bg-background" rows={2} value={fu.messageTemplate}
                      placeholder="Mensagem (use {nome}, {procedimento})…" onChange={(e) => updateFollowup(fu.id, { messageTemplate: e.target.value })} />
                  </div>
                ))}
                <button
                  onClick={() => addFollowup(current.id, { offsetDays: 7, title: "", channel: "mensagem", messageTemplate: "", orderIndex: current.followups.length })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar toque
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 justify-end pt-2">
            {isEdit && (
              <button onClick={handleDelete} className="mr-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            )}
            <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Fechar</button>
            <button onClick={handleSave} disabled={!f.name.trim()} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
              {isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcedureModal;
