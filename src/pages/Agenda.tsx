import React, { useMemo, useState } from "react";
import { useAppointments } from "@/context/AppointmentsContext";
import { useLeads } from "@/context/LeadsContext";
import { useAuth } from "@/context/AuthContext";
import {
  APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPE_OPTIONS,
  AppointmentStatus, AppointmentType,
} from "@/types/appointment";
import { Plus, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  agendado: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  compareceu: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  nao_compareceu: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  remarcado: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  cancelado: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtDateLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

const Agenda: React.FC = () => {
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { leads } = useLeads();
  const { user, role } = useAuth();

  const [filterDate, setFilterDate] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMine, setFilterMine] = useState(false);
  const [open, setOpen] = useState(false);

  // form
  const [leadId, setLeadId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState<AppointmentType>("avaliacao");
  const [notes, setNotes] = useState("");

  const leadById = useMemo(() => Object.fromEntries(leads.map(l => [l.id, l])), [leads]);

  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterMine && a.assignedTo !== user?.id) return false;
      if (filterDate) {
        const d = new Date(a.scheduledAt).toISOString().slice(0, 10);
        if (d !== filterDate) return false;
      }
      return true;
    });
  }, [appointments, filterStatus, filterMine, filterDate, user]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(a => {
      const key = new Date(a.scheduledAt).toISOString().slice(0, 10);
      (map[key] ||= []).push(a);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleCreate = async () => {
    if (!leadId || !date || !time) return;
    const iso = new Date(`${date}T${time}:00`).toISOString();
    await addAppointment({ leadId, scheduledAt: iso, type, notes });
    setOpen(false);
    setLeadId(""); setDate(""); setTime("09:00"); setType("avaliacao"); setNotes("");
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Agenda</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Compromissos comerciais vinculados aos leads</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Novo agendamento
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5 bg-card border border-border rounded-lg p-3">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="text-sm border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Todos status</option>
            {APPOINTMENT_STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{APPOINTMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          {role !== "seller" && (
            <button
              onClick={() => setFilterMine(v => !v)}
              className={`text-xs px-2.5 py-1.5 rounded-md border ${filterMine ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            >Meus</button>
          )}
          {(filterDate || filterStatus !== "all" || filterMine) && (
            <button
              onClick={() => { setFilterDate(""); setFilterStatus("all"); setFilterMine(false); }}
              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
            >Limpar filtros</button>
          )}
        </div>

        {/* List */}
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nenhum agendamento encontrado
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {fmtDateLabel(day)}
                </h3>
                <div className="space-y-2">
                  {items.map(a => {
                    const lead = leadById[a.leadId];
                    return (
                      <div key={a.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-bold text-foreground">
                            {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase">{APPOINTMENT_TYPE_LABELS[a.type]}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {lead?.name ?? "Lead removido"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{lead?.phone ?? "—"}</p>
                          {a.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.notes}</p>}
                        </div>
                        <select
                          value={a.status}
                          onChange={e => updateAppointment(a.id, { status: e.target.value as AppointmentStatus })}
                          className={`text-xs font-medium px-2 py-1 rounded border-0 focus:outline-none focus:ring-1 focus:ring-ring ${STATUS_CLASSES[a.status]}`}
                        >
                          {APPOINTMENT_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{APPOINTMENT_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => { if (confirm("Excluir agendamento?")) deleteAppointment(a.id); }}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New appointment dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Lead</label>
              <select
                value={leadId}
                onChange={e => setLeadId(e.target.value)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecione um lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Horário</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as AppointmentType)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {APPOINTMENT_TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!leadId || !date || !time}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                Criar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
