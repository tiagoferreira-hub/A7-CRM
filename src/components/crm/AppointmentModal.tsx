import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLeads } from "@/context/LeadsContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  APPOINTMENT_TYPE_OPTIONS,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_STATUS_LABELS,
  DURATION_OPTIONS,
} from "@/types/appointment";
import { combineDateTime, splitDateTime } from "@/lib/calendar";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment | null; // null/undefined => criar
  defaultDate?: string; // 'YYYY-MM-DD' ao criar a partir de um dia
}

const inputCls =
  "w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const labelCls = "text-xs font-medium text-muted-foreground";

const AppointmentModal: React.FC<Props> = ({ open, onClose, appointment, defaultDate }) => {
  const { leads } = useLeads();
  const { addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const members = useCompanyMembers();
  const isEdit = !!appointment;

  const [leadId, setLeadId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState<AppointmentType>("avaliacao");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [status, setStatus] = useState<AppointmentStatus>("agendado");
  const [notes, setNotes] = useState("");

  // Carrega os valores quando o modal abre.
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      const { date: d, time: t } = splitDateTime(appointment.scheduledAt);
      setLeadId(appointment.leadId);
      setDate(d);
      setTime(t);
      setDuration(appointment.durationMinutes ?? 60);
      setType(appointment.type);
      setAssignedTo(appointment.assignedTo ?? "");
      setStatus(appointment.status);
      setNotes(appointment.notes ?? "");
    } else {
      setLeadId("");
      setDate(defaultDate ?? splitDateTime(new Date().toISOString()).date);
      setTime("09:00");
      setDuration(60);
      setType("avaliacao");
      setAssignedTo("");
      setStatus("agendado");
      setNotes("");
    }
  }, [open, appointment, defaultDate]);

  const canSave = !!leadId && !!date && !!time;

  const handleSave = async () => {
    if (!canSave) return;
    const scheduledAt = combineDateTime(date, time);
    if (isEdit && appointment) {
      await updateAppointment(appointment.id, {
        leadId,
        scheduledAt,
        durationMinutes: duration,
        type,
        assignedTo: assignedTo || null,
        status,
        notes,
      });
    } else {
      await addAppointment({
        leadId,
        scheduledAt,
        durationMinutes: duration,
        type,
        assignedTo: assignedTo || null,
        notes,
      });
    }
    onClose();
  };

  const handleCancelAppointment = async () => {
    if (appointment) await updateAppointment(appointment.id, { status: "cancelado" });
    onClose();
  };

  const handleDelete = async () => {
    if (appointment && confirm("Excluir este agendamento? Esta ação não pode ser desfeita.")) {
      await deleteAppointment(appointment.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className={labelCls}>Lead</label>
            <select className={inputCls} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">Selecione um lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Hora</label>
              <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Duração</label>
              <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as AppointmentType)}>
                {APPOINTMENT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Profissional</label>
              <select className={inputCls} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.displayName}</option>
                ))}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
                  {APPOINTMENT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{APPOINTMENT_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Observações</label>
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 justify-end pt-2">
            {isEdit && (
              <>
                <button
                  onClick={handleDelete}
                  className="mr-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg text-destructive hover:bg-destructive/10"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
                <button
                  onClick={handleCancelAppointment}
                  className="text-sm font-medium px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent"
                >
                  Cancelar agend.
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;
