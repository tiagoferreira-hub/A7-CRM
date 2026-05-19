import React, { useState } from "react";
import { useTasks, Task } from "@/context/TasksContext";
import { useLeads } from "@/context/LeadsContext";
import { useAuth } from "@/context/AuthContext";
import TaskEditModal from "@/components/TaskEditModal";
import { Plus, Trash2, Check, Clock, AlertTriangle, Circle } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  done: "Feito",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

const Tasks: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { leads } = useLeads();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);

  const handleAdd = async () => {
    if (!title.trim() || !user) return;
    await addTask({
      title: title.trim(),
      leadId: leadId || null,
      assignedTo: user.id,
      dueDate: dueDate || null,
      status: "todo",
    });
    setTitle("");
    setLeadId("");
    setDueDate("");
    setShowForm(false);
  };

  const cycleStatus = (task: Task) => {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    updateTask(task.id, { status: next as Task["status"] });
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = tasks.filter(t => t.status !== "done" && t.dueDate && new Date(t.dueDate) < today);
  const todayTasks = tasks.filter(t => t.status !== "done" && t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString());
  const pending = tasks.filter(t => t.status !== "done" && !overdue.includes(t) && !todayTasks.includes(t));
  const done = tasks.filter(t => t.status === "done");

  const TaskItem = ({ task }: { task: Task }) => {
    const lead = leads.find(l => l.id === task.leadId);
    return (
      <div
        onClick={() => setEditing(task)}
        className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors group border border-border mb-1 cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={(e) => { e.stopPropagation(); cycleStatus(task); }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </button>
          <span className={`text-sm ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </span>
          {lead && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{lead.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className="text-[11px] text-muted-foreground">
              {new Date(task.dueDate).toLocaleDateString("pt-BR")}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
            className="p-1 rounded hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const Section = ({ title, icon: Icon, tasks: items, color }: { title: string; icon: any; tasks: Task[]; color?: string }) => (
    items.length > 0 ? (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={color ? { color } : undefined} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        {items.map(t => <TaskItem key={t.id} task={t} />)}
      </div>
    ) : null
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Tarefas</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6 space-y-3">
          <input
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Título da tarefa..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <div className="flex gap-3">
            <select
              className="flex-1 text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
            >
              <option value="">Lead (opcional)</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input
              type="date"
              className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Section title="Atrasadas" icon={AlertTriangle} tasks={overdue} color="hsl(0, 72%, 55%)" />
      <Section title="Hoje" icon={Clock} tasks={todayTasks} color="hsl(220, 70%, 50%)" />
      <Section title="Pendentes" icon={Circle} tasks={pending} />
      <Section title="Concluídas" icon={Check} tasks={done} color="hsl(152, 60%, 42%)" />

      {tasks.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhuma tarefa cadastrada</p>
      )}

      <TaskEditModal task={editing} open={!!editing} onClose={() => setEditing(null)} />
    </div>
  );
};

export default Tasks;
