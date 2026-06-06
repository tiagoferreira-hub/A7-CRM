import React, { useMemo, useState } from "react";
import { useAppointments } from "@/context/AppointmentsContext";
import { useLeads } from "@/context/LeadsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  AppointmentStatus,
  Appointment,
  INACTIVE_STATUSES,
} from "@/types/appointment";
import {
  getWeekDays,
  sameDay,
  addDays,
  startOfDay,
  rescheduleToDay,
  splitDateTime,
  weekdayLabel,
  formatTime,
} from "@/lib/calendar";
import AppointmentModal from "@/components/crm/AppointmentModal";
import { Plus, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  agendado: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  compareceu: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  nao_compareceu: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  remarcado: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  cancelado: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

type View = "week" | "day";

const Agenda: React.FC = () => {
  const { appointments, updateAppointment } = useAppointments();
  const { leads } = useLeads();
  const members = useCompanyMembers();

  const [view, setView] = useState<View>("week");
  const [refDate, setRefDate] = useState<Date>(() => startOfDay(new Date()));
  const [hideInactive, setHideInactive] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [createDate, setCreateDate] = useState<string | undefined>(undefined);

  const leadById = useMemo(() => {
    const m: Record<string, { name: string; phone: string }> = {};
    leads.forEach((l) => (m[l.id] = { name: l.name, phone: l.phone }));
    return m;
  }, [leads]);

  const memberById = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((x) => (m[x.userId] = x.displayName));
    return m;
  }, [members]);

  const visible = useMemo(() => {
    return appointments.filter((a) => {
      if (hideInactive && INACTIVE_STATUSES.includes(a.status)) return false;
      return true;
    });
  }, [appointments, hideInactive]);

  const days = useMemo(() => (view === "week" ? getWeekDays(refDate) : [refDate]), [view, refDate]);

  const apptsForDay = (day: Date) =>
    visible
      .filter((a) => sameDay(new Date(a.scheduledAt), day))
      .sort((x, y) => x.scheduledAt.localeCompare(y.scheduledAt));

  const upcoming = useMemo(() => {
    const now = new Date().toISOString();
    return appointments
      .filter((a) => a.scheduledAt >= now && !INACTIVE_STATUSES.includes(a.status))
      .sort((x, y) => x.scheduledAt.localeCompare(y.scheduledAt))
      .slice(0, 8);
  }, [appointments]);

  const openCreate = (day?: Date) => {
    setEditing(null);
    setCreateDate(day ? splitDateTime(day.toISOString()).date : undefined);
    setModalOpen(true);
  };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setCreateDate(undefined);
    setModalOpen(true);
  };

  const onDropDay = (day: Date, apptId: string) => {
    const appt = appointments.find((a) => a.id === apptId);
    if (!appt) return;
    if (sameDay(new Date(appt.scheduledAt), day)) return;
    updateAppointment(apptId, { scheduledAt: rescheduleToDay(appt.scheduledAt, day) });
  };

  const periodLabel =
    view === "week"
      ? `${days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
      : refDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const step = (dir: number) => setRefDate((d) => addDays(d, dir * (view === "week" ? 7 : 1)));

  const today = startOfDay(new Date());

  const Card: React.FC<{ a: Appointment }> = ({ a }) => {
    const lead = leadById[a.leadId];
    const prof = a.assignedTo ? memberById[a.assignedTo] : null;
    return (
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("apptId", a.id)}
        onClick={() => openEdit(a)}
        className={`cursor-pointer rounded-md border px-2 py-1.5 text-left transition-shadow hover:shadow-sm ${STATUS_CLASSES[a.status]} ${a.status === "cancelado" ? "opacity-60" : ""}`}
        title={`${APPOINTMENT_TYPE_LABELS[a.type]} • ${APPOINTMENT_STATUS_LABELS[a.status]}`}
      >
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          <Clock className="w-3 h-3" /> {formatTime(a.scheduledAt)}
          <span className="ml-auto text-[9px] font-medium uppercase opacity-80">{APPOINTMENT_TYPE_LABELS[a.type]}</span>
        </div>
        <div className="text-xs font-medium text-foreground truncate mt-0.5">
          {lead?.name ?? "Lead removido"}
        </div>
        {prof && <div className="text-[10px] text-muted-foreground truncate">{prof}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => step(-1)} className="p-2 rounded-lg border border-input hover:bg-accent" title="Anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setRefDate(startOfDay(new Date()))} className="text-sm px-3 py-2 rounded-lg border border-input hover:bg-accent">
            Hoje
          </button>
          <button onClick={() => step(1)} className="p-2 rounded-lg border border-input hover:bg-accent" title="Próximo">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="text-sm font-semibold text-foreground capitalize">{periodLabel}</span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-input overflow-hidden">
            <button onClick={() => setView("week")} className={`text-sm px-3 py-1.5 ${view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Semana</button>
            <button onClick={() => setView("day")} className={`text-sm px-3 py-1.5 ${view === "day" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Dia</button>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={hideInactive} onChange={(e) => setHideInactive(e.target.checked)} />
            Ocultar cancelados
          </label>
          <button
            onClick={() => openCreate(view === "day" ? refDate : undefined)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Novo agendamento
          </button>
        </div>
      </div>

      {/* Body: calendar + upcoming */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 overflow-auto p-4">
          <div className={view === "week" ? "grid grid-cols-7 gap-2 min-w-[760px]" : "max-w-2xl mx-auto"}>
            {days.map((day) => {
              const isToday = sameDay(day, today);
              const list = apptsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary/30"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-primary/30")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-2", "ring-primary/30");
                    const id = e.dataTransfer.getData("apptId");
                    if (id) onDropDay(day, id);
                  }}
                  className="rounded-lg border border-border bg-card/40 flex flex-col min-h-[200px]"
                >
                  <div className={`flex items-center justify-between px-2 py-1.5 border-b border-border ${isToday ? "bg-primary/10" : ""}`}>
                    <div className="text-xs font-semibold text-foreground">
                      <span className="capitalize">{weekdayLabel(day)}</span>{" "}
                      <span className={isToday ? "text-primary" : "text-muted-foreground"}>{day.getDate()}</span>
                    </div>
                    <button onClick={() => openCreate(day)} className="p-0.5 rounded hover:bg-accent text-muted-foreground" title="Adicionar">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 p-1.5 space-y-1.5">
                    {list.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center pt-3">—</p>
                    ) : (
                      list.map((a) => <Card key={a.id} a={a} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming side panel */}
        <aside className="w-64 shrink-0 border-l border-border bg-card hidden lg:flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Próximos</h3>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-4">Nenhum agendamento futuro.</p>
            ) : (
              upcoming.map((a) => {
                const lead = leadById[a.leadId];
                return (
                  <button
                    key={a.id}
                    onClick={() => openEdit(a)}
                    className="w-full text-left rounded-lg border border-border p-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(a.scheduledAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {formatTime(a.scheduledAt)}
                    </div>
                    <div className="text-sm font-medium text-foreground truncate">{lead?.name ?? "Lead removido"}</div>
                    <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_CLASSES[a.status]}`}>
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        appointment={editing}
        defaultDate={createDate}
      />
    </div>
  );
};

export default Agenda;
