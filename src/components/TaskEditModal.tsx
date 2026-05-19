import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Task, useTasks } from "@/context/TasksContext";
import { useLeads } from "@/context/LeadsContext";
import { Check, Trash2 } from "lucide-react";

const STATUS_OPTIONS: { value: Task["status"]; label: string }[] = [
  { value: "todo", label: "A fazer" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Feito" },
];

interface Props {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

const TaskEditModal: React.FC<Props> = ({ task, open, onClose }) => {
  const { updateTask, deleteTask } = useTasks();
  const { leads } = useLeads();
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<Task["status"]>("todo");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setLeadId(task.leadId ?? "");
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setStatus(task.status);
    }
  }, [task]);

  if (!task) return null;

  const save = async () => {
    await updateTask(task.id, {
      title: title.trim() || task.title,
      leadId: leadId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      status,
    });
    onClose();
  };
  const conclude = async () => { await updateTask(task.id, { status: "done" }); onClose(); };
  const remove = async () => {
    if (!confirm("Excluir esta tarefa?")) return;
    await deleteTask(task.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-xl shadow-lg">
        <DialogHeader><DialogTitle>Editar tarefa</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Lead vinculado</label>
              <select value={leadId} onChange={(e) => setLeadId(e.target.value)}
                className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background">
                <option value="">— Nenhum —</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])}
              className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border mt-2">
          <button onClick={remove} className="inline-flex items-center gap-1.5 text-sm h-10 px-3 rounded-lg text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
          <div className="flex gap-2">
            {status !== "done" && (
              <button onClick={conclude} className="inline-flex items-center gap-1.5 text-sm h-10 px-3 rounded-lg border border-input hover:bg-accent">
                <Check className="w-4 h-4" /> Concluir
              </button>
            )}
            <button onClick={onClose} className="text-sm h-10 px-3 rounded-lg border border-input hover:bg-accent">Cancelar</button>
            <button onClick={save} className="text-sm h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Salvar</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditModal;
