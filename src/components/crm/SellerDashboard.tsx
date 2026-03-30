import React, { useState, useMemo } from "react";
import { useLeads } from "@/context/LeadsContext";
import { useTasks } from "@/context/TasksContext";
import { useAuth } from "@/context/AuthContext";
import { Users, Calendar, TrendingUp, Clock, AlertTriangle, Circle, Check } from "lucide-react";

type Period = "today" | "yesterday" | "7d" | "14d" | "1m" | "3m" | "1y";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7d": "Últimos 7 dias",
  "14d": "Últimos 14 dias",
  "1m": "Último mês",
  "3m": "Últimos 3 meses",
  "1y": "Último ano",
};

const periodToDays: Record<Period, number> = {
  today: 0,
  yesterday: 1,
  "7d": 7,
  "14d": 14,
  "1m": 30,
  "3m": 90,
  "1y": 365,
};

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

const SellerDashboard: React.FC = () => {
  const { leads } = useLeads();
  const { tasks, updateTask } = useTasks();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("7d");

  const filtered = useMemo(() => {
    const now = new Date();
    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return leads.filter(l => new Date(l.createdAt) >= start);
    }
    if (period === "yesterday") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return leads.filter(l => { const d = new Date(l.createdAt); return d >= start && d < end; });
    }
    const days = periodToDays[period];
    const cutoff = new Date(now.getTime() - days * 86400000);
    return leads.filter(l => new Date(l.createdAt) >= cutoff);
  }, [leads, period]);

  const atendidos = filtered.filter(l => l.stage !== "lead_entrou").length;
  const agendamentos = filtered.filter(l => ["agendado", "compareceu", "fechou"].includes(l.stage)).length;
  const vendas = filtered.filter(l => l.stage === "fechou").length;

  // Follow-ups: leads em atendimento ou qualificado sem interação há 2+ dias
  const followUpsPendentes = leads.filter(l =>
    ["em_atendimento", "qualificado"].includes(l.stage) &&
    (new Date().getTime() - new Date(l.lastInteraction).getTime()) > 2 * 86400000
  ).length;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const myTasks = tasks.filter(t => t.assignedTo === user?.id);
  const overdue = myTasks.filter(t => t.status !== "done" && t.dueDate && new Date(t.dueDate) < today);
  const todayTasks = myTasks.filter(t => t.status !== "done" && t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString());
  const pending = myTasks.filter(t => t.status !== "done" && !overdue.includes(t) && !todayTasks.includes(t));

  const cycleStatus = (task: any) => {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    updateTask(task.id, { status: next });
  };

  const MetricCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: string }) => (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" style={color ? { color } : undefined} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );

  const TaskItem = ({ task }: { task: any }) => (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors border border-border mb-1">
      <div className="flex items-center gap-2">
        <button onClick={() => cycleStatus(task)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </button>
        <span className={`text-sm ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</span>
      </div>
      {task.dueDate && <span className="text-[11px] text-muted-foreground">{new Date(task.dueDate).toLocaleDateString("pt-BR")}</span>}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Meu Painel</h2>
        <select
          className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={period}
          onChange={e => setPeriod(e.target.value as Period)}
        >
          {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Leads atendidos" value={atendidos} />
        <MetricCard icon={Calendar} label="Agendamentos" value={agendamentos} color="hsl(220, 70%, 50%)" />
        <MetricCard icon={TrendingUp} label="Vendas" value={vendas} color="hsl(152, 60%, 42%)" />
        <MetricCard icon={Clock} label="Follow-ups pendentes" value={followUpsPendentes} color="hsl(38, 92%, 50%)" />
      </div>

      {/* Tasks section */}
      <div className="space-y-4">
        {overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "hsl(0, 72%, 55%)" }} />
              <h3 className="text-sm font-semibold text-foreground">Atrasadas ({overdue.length})</h3>
            </div>
            {overdue.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}
        {todayTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" style={{ color: "hsl(220, 70%, 50%)" }} />
              <h3 className="text-sm font-semibold text-foreground">Hoje ({todayTasks.length})</h3>
            </div>
            {todayTasks.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}
        {pending.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Circle className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Pendentes ({pending.length})</h3>
            </div>
            {pending.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}
        {overdue.length === 0 && todayTasks.length === 0 && pending.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa pendente</p>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
