import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Lead, STAGE_LABELS, ORIGIN_LABELS, ORIGIN_OPTIONS, LeadStage, LeadOrigin } from "@/types/lead";
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
import StageStepper from "./StageStepper";
import ServiceBadges from "./ServiceBadges";
import { useConversations } from "@/context/ConversationsContext";
import {
  Phone, Plus, X as XIcon, MessageCircle, Instagram, Megaphone, Hand,
  Search as SearchIcon, Sparkles, MessageSquare, CalendarPlus, ListTodo,
  Clock, AlertCircle, Tag as TagIcon, DollarSign, Briefcase, FileText,
} from "lucide-react";

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

const daysSince = (s: string) => Math.floor((Date.now() - new Date(s).getTime()) / 86400000);

const originBadge = (origin: LeadOrigin) => {
  const map: Record<LeadOrigin, { icon: any; color: string; bg: string }> = {
    manual: { icon: Hand, color: "text-muted-foreground", bg: "bg-muted" },
    bio_instagram: { icon: Instagram, color: "text-crm-purple", bg: "bg-crm-purple-light" },
    meta: { icon: Megaphone, color: "text-crm-info", bg: "bg-crm-info-light" },
    google_ads: { icon: SearchIcon, color: "text-crm-warning", bg: "bg-crm-warning-light" },
    indicacao: { icon: Sparkles, color: "text-crm-success", bg: "bg-crm-success-light" },
    organico: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
  };
  return map[origin];
};

const eventLabel = (e: { eventType: string; payload: any }) => {
  switch (e.eventType) {
    case "created": return "Lead criado";
    case "stage_changed": return `${STAGE_LABELS[e.payload?.from as LeadStage] ?? e.payload?.from} → ${STAGE_LABELS[e.payload?.to as LeadStage] ?? e.payload?.to}`;
    case "assignee_changed": return "Responsável alterado";
    case "followup_created": return "Follow-up criado";
    case "followup_completed": return "Follow-up concluído";
    case "lost_reason": return `Motivo de perda: ${e.payload?.reason ?? "—"}`;
    case "appointment_created": return `Agendamento (${e.payload?.type ?? ""})`;
    default: return e.eventType;
  }
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
    {children}
  </h4>
);

const LeadDetailModal: React.FC<Props> = ({ lead, open, onClose }) => {
  const navigate = useNavigate();
  const { updateLead, moveLead } = useLeads();
  const { services } = useServices();
  const { appointments } = useAppointments();
  const { followUps, addFollowUp } = useFollowUps();
  const { tags, createTag, assignTag, unassignTag, tagsForLead } = useTags();
  const { conversations } = useConversations();
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
  const [saving, setSaving] = useState(false);

  const leadAppts = useMemo(
    () => lead ? appointments.filter(a => a.leadId === lead.id).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)) : [],
    [appointments, lead]
  );
  const nextFollowUp = useMemo(
    () => lead ? followUps
      .filter(f => f.leadId === lead.id && f.status !== "concluido")
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]
      : null,
    [followUps, lead]
  );
  const leadTags = lead ? tagsForLead(lead.id) : [];
  const leadTagIds = new Set(leadTags.map(t => t.id));

  if (!lead) return null;

  const startEdit = () => {
    setForm({
      name: lead.name, phone: lead.phone, origin: lead.origin, service: lead.service,
      value: lead.value, observations: lead.observations, assignedTo: lead.assignedTo,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    const val = typeof form.value === "string"
      ? parseFloat((form.value as string).replace(/[^\d.,]/g, "").replace(",", ".")) || 0
      : (form.value ?? lead.value);
    setSaving(true);
    try {
      await updateLead(lead.id, { ...form, value: val as number });
      setEditing(false);
    } catch (err) {
      console.error("Erro ao salvar lead:", err);
      alert("Erro ao salvar lead. Tente novamente.");
    } finally {
      setSaving(false);
    }
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

  const origBadge = originBadge(lead.origin);
  const OriginIcon = origBadge.icon;
  const leadConv = conversations.find(c => c.leadId === lead.id);
  const isConvClosed = leadConv?.status === "closed";
  const daysNoResp = daysSince(lead.lastInteraction);
  const noRespAlert = daysNoResp > 2 && !isConvClosed;

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-xl shadow-lg gap-0">
          {!editing ? (
            <>
              {/* HEADER */}
              <DialogHeader className="px-6 pt-6 pb-5 border-b border-border space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-2xl font-bold text-foreground truncate">
                      {lead.name}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phone}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${origBadge.bg} ${origBadge.color}`}>
                        <OriginIcon className="w-3 h-3" />
                        {ORIGIN_LABELS[lead.origin]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <StageStepper value={lead.stage} onChange={handleStageChange} />
                  <select
                    className="text-sm h-10 border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    value={lead.assignedTo ?? ""}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                  >
                    <option value="">Sem responsável</option>
                    {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                  </select>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setFupOpen(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium h-10 px-3 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                      <Clock className="w-4 h-4" /> Follow-up
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 text-sm font-medium h-10 px-3 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                      <ListTodo className="w-4 h-4" /> Tarefa
                    </button>
                    <button
                      onClick={() => navigate("/agenda")}
                      className="inline-flex items-center gap-1.5 text-sm font-medium h-10 px-3 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                      <CalendarPlus className="w-4 h-4" /> Agendar
                    </button>
                  </div>
                </div>
              </DialogHeader>

              {/* BODY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* Left column */}
                <div className="space-y-5">
                  <div>
                    <SectionLabel>Informações comerciais</SectionLabel>
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      <div className="flex items-start gap-2.5">
                        <OriginIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-[11px] text-muted-foreground">Origem</div>
                          <div className="text-sm text-foreground">{ORIGIN_LABELS[lead.origin]}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-muted-foreground mb-1">Serviços de interesse</div>
                          <ServiceBadges value={lead.services ?? (lead.service ? [lead.service] : [])} readOnly size="xs" />
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-[11px] text-muted-foreground">Valor</div>
                          <div className="text-sm font-semibold text-primary">{formatCurrency(lead.value)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Observações</SectionLabel>
                    <div className="rounded-lg border border-border p-4 text-sm text-foreground whitespace-pre-wrap min-h-[60px]">
                      {lead.observations || <span className="text-muted-foreground">Sem observações.</span>}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Tags</SectionLabel>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {leadTags.map(t => (
                        <span key={t.id} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                          {t.name}
                          <button onClick={() => unassignTag(lead.id, t.id)} className="hover:opacity-70"><XIcon className="w-3 h-3" /></button>
                        </span>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          list="tag-options-detail"
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                          placeholder="Adicionar tag..."
                          className="text-xs h-8 border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <datalist id="tag-options-detail">
                          {tags.filter(t => !leadTagIds.has(t.id)).map(t => <option key={t.id} value={t.name} />)}
                        </datalist>
                        <button onClick={handleAddTag} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <div>
                    <SectionLabel>Atividade</SectionLabel>
                    <div className="space-y-2.5">
                      <div className={`flex items-center gap-2.5 rounded-lg border p-3 ${
                        noRespAlert ? "border-crm-warning/40 bg-crm-warning-light" : "border-border"
                      }`}>
                        {noRespAlert
                          ? <AlertCircle className="w-4 h-4 text-crm-warning" />
                          : <Clock className="w-4 h-4 text-muted-foreground" />}
                        <div className="text-sm">
                          <div className={`font-medium ${noRespAlert ? "text-crm-warning" : "text-foreground"}`}>
                            {daysNoResp === 0 ? "Sem mensagens hoje" : `${daysNoResp} ${daysNoResp === 1 ? "dia" : "dias"} sem resposta`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">Última: {formatDateTime(lead.lastInteraction)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-lg border border-border p-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium text-foreground">Próximo follow-up</div>
                          <div className="text-[11px] text-muted-foreground">
                            {nextFollowUp ? formatDateTime(nextFollowUp.scheduledAt) : "Não agendado"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Agendamentos</SectionLabel>
                    {leadAppts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum agendamento</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {leadAppts.map(a => (
                          <li key={a.id} className="text-sm text-foreground flex items-center justify-between border border-border rounded-md px-3 py-2">
                            <span>{APPOINTMENT_TYPE_LABELS[a.type]} — {formatDateTime(a.scheduledAt)}</span>
                            <span className="text-xs text-muted-foreground">{APPOINTMENT_STATUS_LABELS[a.status]}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <SectionLabel>Histórico</SectionLabel>
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem eventos.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {history.map(e => (
                          <li key={e.id} className="text-xs text-foreground flex items-start justify-between gap-2 border-l-2 border-border pl-2.5 py-0.5">
                            <span>{eventLabel(e)}</span>
                            <span className="text-muted-foreground shrink-0">{formatDateTime(e.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
                <button onClick={startEdit}
                  className="text-sm font-medium h-10 px-4 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                  Editar lead
                </button>
                <button
                  onClick={() => { onClose(); navigate(`/conversas?lead=${lead.id}`); }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                  <MessageSquare className="w-4 h-4" /> Ver conversa
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                <DialogTitle className="text-xl font-semibold">Editar lead</DialogTitle>
              </DialogHeader>
              <div className="p-6 space-y-6">
                {/* Básicos */}
                <div className="space-y-3">
                  <SectionLabel>Informações básicas</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Nome</label>
                      <input value={(form.name as string) ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Telefone</label>
                      <input value={(form.phone as string) ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Comercial */}
                <div className="space-y-3">
                  <SectionLabel>Comercial</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Origem</label>
                      <select value={form.origin ?? lead.origin}
                        onChange={(e) => setForm({ ...form, origin: e.target.value as LeadOrigin })}
                        className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                        {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Serviços de interesse</label>
                      <ServiceBadges
                        value={(form.services as string[]) ?? lead.services ?? (lead.service ? [lead.service] : [])}
                        onChange={(v) => setForm({ ...form, services: v } as any)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Valor (R$)</label>
                      <input value={(form.value as any) ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value as any })}
                        className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Responsável</label>
                      <select value={(form.assignedTo as string) ?? ""}
                        onChange={(e) => setForm({ ...form, assignedTo: e.target.value || null } as any)}
                        className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="">Sem responsável</option>
                        {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Observações & Tags */}
                <div className="space-y-3">
                  <SectionLabel>Observações</SectionLabel>
                  <textarea rows={4} value={(form.observations as string) ?? ""}
                    onChange={(e) => setForm({ ...form, observations: e.target.value })}
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                      <TagIcon className="w-3.5 h-3.5" /> Tags
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {leadTags.map(t => (
                        <span key={t.id} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                          {t.name}
                          <button onClick={() => unassignTag(lead.id, t.id)} className="hover:opacity-70"><XIcon className="w-3 h-3" /></button>
                        </span>
                      ))}
                      <input
                        list="tag-options-edit"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                        placeholder="Adicionar tag..."
                        className="text-xs h-8 border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <datalist id="tag-options-edit">
                        {tags.filter(t => !leadTagIds.has(t.id)).map(t => <option key={t.id} value={t.name} />)}
                      </datalist>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
                <button onClick={() => setEditing(false)} disabled={saving} className="text-sm font-medium h-10 px-4 rounded-lg border border-input bg-background hover:bg-accent transition-colors">Cancelar</button>
                <button onClick={saveEdit} disabled={saving} className="text-sm font-medium h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LossReasonModal open={lossOpen} onClose={() => { setLossOpen(false); setPendingStage(null); }} onConfirm={confirmLoss} />

      <Dialog open={fupOpen} onOpenChange={setFupOpen}>
        <DialogContent className="max-w-md rounded-xl shadow-lg">
          <DialogHeader><DialogTitle>Novo follow-up — {lead.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Data</label>
                <input type="date" value={fupDate} onChange={e => setFupDate(e.target.value)}
                  className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Horário</label>
                <input type="time" value={fupTime} onChange={e => setFupTime(e.target.value)}
                  className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Observação</label>
              <textarea value={fupNotes} onChange={e => setFupNotes(e.target.value)} rows={2}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setFupOpen(false)} className="text-sm font-medium h-10 px-4 rounded-lg border border-input bg-background hover:bg-accent">Cancelar</button>
              <button onClick={handleCreateFup} disabled={!fupDate}
                className="text-sm font-medium h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadDetailModal;
