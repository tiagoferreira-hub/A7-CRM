import React, { useState, useMemo } from "react";
import { Lead, STAGE_LABELS, STAGE_ORDER, ORIGIN_LABELS, ORIGIN_OPTIONS, LeadStage, LeadOrigin } from "@/types/lead";
import { useLeads } from "@/context/LeadsContext";
import { useServices } from "@/context/ServicesContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useFollowUps } from "@/context/FollowUpsContext";
import { useTags } from "@/context/TagsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useLeadHistory } from "@/hooks/useLeadHistory";
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_LABELS } from "@/types/appointment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LossReasonModal from "./LossReasonModal";
import { Plus, X as XIcon } from "lucide-react";

interface Props {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const eventLabel = (e: { eventType: string; payload: any }) => {
  switch (e.eventType) {
    case "created": return "Lead criado";
    case "stage_changed": return `Etapa: ${STAGE_LABELS[e.payload?.from as LeadStage] ?? e.payload?.from} → ${STAGE_LABELS[e.payload?.to as LeadStage] ?? e.payload?.to}`;
    case "assignee_changed": return "Responsável alterado";
    case "followup_created": return "Follow-up criado";
    case "followup_completed": return "Follow-up concluído";
    case "lost_reason": return `Motivo de perda: ${e.payload?.reason ?? "—"}`;
    case "appointment_created": return `Agendamento (${e.payload?.type ?? ""})`;
    default: return e.eventType;
  }
};

const LeadDetailModal: React.FC<Props> = ({ lead, open, onClose }) => {
  const { updateLead, moveLead } = useLeads();
  const { services } = useServices();
  const { appointments } = useAppointments();
  const { addFollowUp } = useFollowUps();
  const { tags, createTag, assignTag, unassignTag, tagsForLead } = useTags();
  const members = useCompanyMembers();
  const history = useLeadHistory(lead?.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({});
  const [lossOpen, setLossOpen] = useState(false);
  const [pendingStage, setPendingStage] = useState<LeadStage | null>(null);
  const [fupOpen, setFupOpen] = useState(false);
  const [fupDate, setFupDate] = useState("");
  const [fupTime, setFupTime] = useState("09:00");
  const [fupNotes, setFupNotes] = useState("");
  const [newTag, setNewTag] = useState("");

  const leadAppts = useMemo(
    () => lead ? appointments.filter(a => a.leadId === lead.id).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)) : [],
    [appointments, lead]
  );
  const leadTags = lead ? tagsForLead(lead.id) : [];
  const leadTagIds = new Set(leadTags.map(t => t.id));

  if (!lead) return null;

  const startEdit = () => {
    setForm({
      name: lead.name, phone: lead.phone, origin: lead.origin, service: lead.service,
      value: lead.value, lastMessage: lead.lastMessage, observations: lead.observations,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    const val = typeof form.value === "string"
      ? parseFloat((form.value as string).replace(/[^\d.,]/g, "").replace(",", ".")) || 0
      : form.value;
    updateLead(lead.id, { ...form, value: val as number });
    setEditing(false);
  };

  const handleStageChange = (stage: LeadStage) => {
    if (stage === "perdido" && lead.stage !== "perdido") {
      setPendingStage(stage);
      setLossOpen(true);
    } else {
      moveLead(lead.id, stage);
    }
  };

  const confirmLoss = (reason: string) => {
    if (pendingStage) moveLead(lead.id, pendingStage, reason);
    setLossOpen(false); setPendingStage(null);
  };

  const handleAssigneeChange = (userId: string) => {
    updateLead(lead.id, { assignedTo: userId || null } as any);
  };

  const handleCreateFup = async () => {
    if (!fupDate) return;
    await addFollowUp({
      leadId: lead.id,
      scheduledAt: new Date(`${fupDate}T${fupTime}:00`).toISOString(),
      notes: fupNotes,
    });
    setFupOpen(false); setFupDate(""); setFupTime("09:00"); setFupNotes("");
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const existing = tags.find(t => t.name.toLowerCase() === newTag.trim().toLowerCase());
    const t = existing ?? await createTag(newTag.trim());
    if (t && !leadTagIds.has(t.id)) await assignTag(lead.id, t.id);
    setNewTag("");
  };

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground mt-0.5">{value}</div>
    </div>
  );

  const InputField = ({ label, field, textarea }: { label: string; field: keyof Lead; textarea?: boolean }) => {
    const Tag = textarea ? "textarea" : "input";
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <Tag
          className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          value={(form[field] as string) ?? ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          rows={textarea ? 3 : undefined}
        />
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg">{lead.name}</DialogTitle></DialogHeader>

          {!editing ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Telefone" value={lead.phone} />
                <Field label="Etapa atual" value={
                  <select
                    className="text-sm border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    value={lead.stage}
                    onChange={(e) => handleStageChange(e.target.value as LeadStage)}
                  >
                    {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                } />
                <Field label="Origem" value={ORIGIN_LABELS[lead.origin]} />
                <Field label="Serviço" value={lead.service} />
                <Field label="Valor" value={formatCurrency(lead.value)} />
                <Field label="Responsável" value={
                  <select
                    className="text-sm border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    value={lead.assignedTo ?? ""}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                  >
                    <option value="">Sem responsável</option>
                    {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                  </select>
                } />
              </div>

              {lead.stage === "perdido" && lead.lossReason && (
                <Field label="Motivo da perda" value={<span className="text-rose-600 dark:text-rose-400">{lead.lossReason}</span>} />
              )}

              <Field label="Última interação" value={formatDateTime(lead.lastInteraction)} />
              <Field label="Última mensagem" value={lead.lastMessage} />
              <Field label="Observações" value={lead.observations || "—"} />

              {/* Tags */}
              <div>
                <span className="text-xs font-medium text-muted-foreground">Tags</span>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {leadTags.map(t => (
                    <span key={t.id} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                      {t.name}
                      <button onClick={() => unassignTag(lead.id, t.id)} className="hover:opacity-70"><XIcon className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      list="tag-options"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                      placeholder="Adicionar tag..."
                      className="text-xs border border-input rounded-md px-2 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <datalist id="tag-options">
                      {tags.filter(t => !leadTagIds.has(t.id)).map(t => <option key={t.id} value={t.name} />)}
                    </datalist>
                    <button onClick={handleAddTag} className="p-1 rounded hover:bg-accent text-muted-foreground"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>

              {/* Appointments */}
              <div>
                <span className="text-xs font-medium text-muted-foreground">Agendamentos</span>
                {leadAppts.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-0.5">Nenhum agendamento</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {leadAppts.map(a => (
                      <li key={a.id} className="text-sm text-foreground flex items-center justify-between border border-border rounded-md px-2.5 py-1.5">
                        <span>{APPOINTMENT_TYPE_LABELS[a.type]} — {formatDateTime(a.scheduledAt)}</span>
                        <span className="text-xs text-muted-foreground">{APPOINTMENT_STATUS_LABELS[a.status]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* History */}
              <div>
                <span className="text-xs font-medium text-muted-foreground">Histórico</span>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-0.5">Sem eventos.</p>
                ) : (
                  <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                    {history.map(e => (
                      <li key={e.id} className="text-xs text-foreground flex items-start justify-between gap-2 border-l-2 border-border pl-2">
                        <span>{eventLabel(e)}</span>
                        <span className="text-muted-foreground shrink-0">{formatDateTime(e.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setFupOpen(true)}
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent">
                  Novo follow-up
                </button>
                <button onClick={startEdit}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                  Editar lead
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              <InputField label="Nome" field="name" />
              <InputField label="Telefone" field="phone" />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Origem</label>
                <select
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.origin ?? lead.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value as LeadOrigin })}
                >
                  {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Serviço de interesse</label>
                <select
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.service ?? lead.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                >
                  <option value="">Selecione o serviço</option>
                  {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <InputField label="Valor (R$)" field="value" />
              <InputField label="Última mensagem" field="lastMessage" textarea />
              <InputField label="Observações" field="observations" textarea />
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setEditing(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
                <button onClick={saveEdit} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Salvar</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LossReasonModal open={lossOpen} onClose={() => { setLossOpen(false); setPendingStage(null); }} onConfirm={confirmLoss} />

      <Dialog open={fupOpen} onOpenChange={setFupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo follow-up — {lead.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <input type="date" value={fupDate} onChange={e => setFupDate(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Horário</label>
                <input type="time" value={fupTime} onChange={e => setFupTime(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observação</label>
              <textarea value={fupNotes} onChange={e => setFupNotes(e.target.value)} rows={2}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setFupOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleCreateFup} disabled={!fupDate}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadDetailModal;
