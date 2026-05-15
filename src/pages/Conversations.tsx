import React, { useEffect, useMemo, useState } from "react";
import { useConversations, Message } from "@/context/ConversationsContext";
import { useLeads } from "@/context/LeadsContext";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TasksContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useFollowUps } from "@/context/FollowUpsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { ORIGIN_LABELS, STAGE_LABELS, STAGE_ORDER, LeadStage } from "@/types/lead";
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPE_OPTIONS, AppointmentType } from "@/types/appointment";
import { Search, Send, Phone, CheckSquare, CalendarPlus, Clock, MailOpen, Hourglass, UserCircle2 } from "lucide-react";
import LeadDetailModal from "@/components/crm/LeadDetailModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const Conversations: React.FC = () => {
  const { conversations, loadMessages, sendMessage, markRead, setAwaitingReply, markUnread, assignConversation } = useConversations();
  const { leads, updateLead } = useLeads();
  const { user } = useAuth();
  const { addTask } = useTasks();
  const { addAppointment, appointments } = useAppointments();
  const { addFollowUp, followUps } = useFollowUps();
  const members = useCompanyMembers();
  const memberById = useMemo(() => Object.fromEntries(members.map(m => [m.userId, m])), [members]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterMine, setFilterMine] = useState(false);
  const [filterAwaiting, setFilterAwaiting] = useState(false);
  const [filterNoOwner, setFilterNoOwner] = useState(false);
  const [filterPendingFup, setFilterPendingFup] = useState(false);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [apptOpen, setApptOpen] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("09:00");
  const [apptType, setApptType] = useState<AppointmentType>("avaliacao");
  const [apptNotes, setApptNotes] = useState("");
  const [fupOpen, setFupOpen] = useState(false);
  const [fupDate, setFupDate] = useState("");
  const [fupTime, setFupTime] = useState("09:00");
  const [fupNotes, setFupNotes] = useState("");

  const leadsWithPendingFup = useMemo(
    () => new Set(followUps.filter(f => f.status !== "concluido").map(f => f.leadId)),
    [followUps]
  );

  const leadById = useMemo(() => Object.fromEntries(leads.map(l => [l.id, l])), [leads]);

  const filtered = useMemo(() => {
    return conversations.filter(c => {
      const lead = leadById[c.leadId];
      if (!lead) return false;
      if (filterUnread && c.unreadCount === 0 && !c.isUnread) return false;
      if (filterAwaiting && !c.awaitingReply) return false;
      if (filterNoOwner && c.assignedTo) return false;
      if (filterPendingFup && !leadsWithPendingFup.has(lead.id)) return false;
      if (filterStage !== "all" && lead.stage !== filterStage) return false;
      if (filterOrigin !== "all" && lead.origin !== filterOrigin) return false;
      if (filterMine && c.assignedTo !== user?.id) return false;
      if (search) {
        const s = search.toLowerCase();
        const phone = lead.phone.replace(/\D/g, "");
        const sDigits = s.replace(/\D/g, "");
        const matchesName = lead.name.toLowerCase().includes(s);
        const matchesPhone = sDigits ? phone.includes(sDigits) : false;
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [conversations, leadById, search, filterUnread, filterStage, filterOrigin, filterMine, filterAwaiting, filterNoOwner, filterPendingFup, leadsWithPendingFup, user]);

  const selected = selectedId ? conversations.find(c => c.id === selectedId) : null;
  const selectedLead = selected ? leadById[selected.leadId] : null;

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId).then(setMessages);
    markRead(selectedId);
  }, [selectedId, loadMessages, markRead]);

  const handleSend = async () => {
    if (!selectedId || !input.trim()) return;
    const msg = await sendMessage(selectedId, input);
    if (msg) setMessages(prev => [...prev, msg]);
    setInput("");
  };

  const leadAppointments = useMemo(
    () => selectedLead ? appointments.filter(a => a.leadId === selectedLead.id) : [],
    [appointments, selectedLead]
  );

  const handleCreateTask = async () => {
    if (!selectedLead || !taskTitle.trim()) return;
    await addTask({
      title: taskTitle.trim(),
      leadId: selectedLead.id,
      assignedTo: selected?.assignedTo ?? user?.id ?? "",
      dueDate: taskDate ? new Date(taskDate).toISOString() : null,
      status: "todo",
    });
    setTaskTitle(""); setTaskDate(""); setTaskOpen(false);
  };

  const handleCreateAppt = async () => {
    if (!selectedLead || !apptDate || !apptTime) return;
    const iso = new Date(`${apptDate}T${apptTime}:00`).toISOString();
    await addAppointment({
      leadId: selectedLead.id,
      assignedTo: selected?.assignedTo ?? user?.id ?? null,
      scheduledAt: iso,
      type: apptType,
      notes: apptNotes,
    });
    setApptDate(""); setApptTime("09:00"); setApptType("avaliacao"); setApptNotes(""); setApptOpen(false);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <aside className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nome ou telefone"
              className="w-full pl-8 pr-2 py-2 rounded-md bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: "unread", label: "Não lidas", v: filterUnread, set: setFilterUnread },
              { k: "mine", label: "Minhas", v: filterMine, set: setFilterMine },
              { k: "noowner", label: "Sem responsável", v: filterNoOwner, set: setFilterNoOwner },
              { k: "await", label: "Aguardando", v: filterAwaiting, set: setFilterAwaiting },
              { k: "fup", label: "Follow-up pendente", v: filterPendingFup, set: setFilterPendingFup },
            ].map(f => (
              <button key={f.k} onClick={() => f.set(v => !v)}
                className={`text-[11px] px-2 py-1 rounded-md border ${f.v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >{f.label}</button>
            ))}
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              className="text-[11px] px-1.5 py-1 rounded-md border border-border bg-card text-foreground"
            >
              <option value="all">Etapa</option>
              {STAGE_ORDER.map(k => <option key={k} value={k}>{STAGE_LABELS[k]}</option>)}
            </select>
            <select
              value={filterOrigin}
              onChange={e => setFilterOrigin(e.target.value)}
              className="text-[11px] px-1.5 py-1 rounded-md border border-border bg-card text-foreground"
            >
              <option value="all">Origem</option>
              {Object.entries(ORIGIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground text-center">Nenhuma conversa</p>
          )}
          {filtered.map(c => {
            const lead = leadById[c.leadId];
            if (!lead) return null;
            const isActive = c.id === selectedId;
            const isUnreadVisual = c.unreadCount > 0 || c.isUnread;
            const owner = c.assignedTo ? memberById[c.assignedTo] : null;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-border flex gap-3 items-start hover:bg-accent transition-colors ${isActive ? "bg-accent" : ""}`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Mini-avatar of the responsible (Respond.io style) */}
                  {owner && (
                    <span
                      title={owner.displayName}
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-card"
                    >
                      {owner.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${isUnreadVisual ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>{lead.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{lead.phone}</p>
                  <p className={`text-xs truncate mt-0.5 ${isUnreadVisual ? "text-foreground font-medium" : "text-muted-foreground"}`}>{c.lastMessage || "—"}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">{STAGE_LABELS[lead.stage]}</span>
                    {isUnreadVisual && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium">Não lido</span>
                    )}
                    {c.awaitingReply && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                        <Hourglass className="w-2.5 h-2.5" /> Aguardando
                      </span>
                    )}
                    {leadsWithPendingFup.has(lead.id) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">Follow-up</span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ORIGIN_LABELS[lead.origin]}</span>
                  </div>
                </div>
                {c.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat panel */}
      <section className="flex-1 flex flex-col bg-muted/20">
        {!selected || !selectedLead ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card gap-3 flex-wrap">
              <button
                onClick={() => setOpenLeadId(selectedLead.id)}
                className="flex items-center gap-3 text-left hover:opacity-80"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedLead.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{selectedLead.phone}</p>
                </div>
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Stage select — syncs with pipeline */}
                <select
                  value={selectedLead.stage}
                  onChange={e => updateLead(selectedLead.id, { stage: e.target.value as LeadStage })}
                  className="text-[11px] px-2 py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  title="Etapa do lead"
                >
                  {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
                {/* Owner select — syncs lead + conversation */}
                <select
                  value={selected.assignedTo ?? ""}
                  onChange={e => assignConversation(selected.id, selectedLead.id, e.target.value || null)}
                  className="text-[11px] px-2 py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  title="Responsável"
                >
                  <option value="">Sem responsável</option>
                  {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                </select>
                <button
                  onClick={() => setAwaitingReply(selected.id, !selected.awaitingReply)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md border ${selected.awaitingReply ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40" : "border-border text-muted-foreground hover:bg-accent"}`}
                  title="Aguardando resposta"
                ><Hourglass className="w-3.5 h-3.5" /> Aguardando</button>
                <button
                  onClick={() => markUnread(selected.id, !selected.isUnread)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md border ${selected.isUnread ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40" : "border-border text-muted-foreground hover:bg-accent"}`}
                  title="Marcar não lido"
                ><MailOpen className="w-3.5 h-3.5" /> Não lido</button>
                <button
                  onClick={() => setFupOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-accent"
                ><Clock className="w-3.5 h-3.5" /> Follow-up</button>
                <button
                  onClick={() => setTaskOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-accent"
                ><CheckSquare className="w-3.5 h-3.5" /> Tarefa</button>
                <button
                  onClick={() => setApptOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                ><CalendarPlus className="w-3.5 h-3.5" /> Agendar</button>
              </div>
            </header>

            {leadAppointments.length > 0 && (
              <div className="px-5 py-2 border-b border-border bg-card/50 text-xs text-muted-foreground flex flex-wrap gap-2">
                <span className="font-medium text-foreground">Agendamentos:</span>
                {leadAppointments.slice(0, 3).map(a => (
                  <span key={a.id} className="px-2 py-0.5 rounded bg-muted">
                    {APPOINTMENT_TYPE_LABELS[a.type]} — {new Date(a.scheduledAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda</p>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    m.direction === "outbound"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card text-foreground rounded-bl-none border border-border"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${m.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="border-t border-border bg-card p-3 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Digite uma mensagem..."
                className="flex-1 rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-primary text-primary-foreground rounded-md px-4 flex items-center gap-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                <Send className="w-4 h-4" /> Enviar
              </button>
            </footer>
          </>
        )}
      </section>

      <LeadDetailModal
        lead={openLeadId ? leadById[openLeadId] ?? null : null}
        open={!!openLeadId}
        onClose={() => setOpenLeadId(null)}
      />

      {/* Quick task dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova tarefa{selectedLead ? ` — ${selectedLead.name}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Título</label>
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Vencimento</label>
              <input type="datetime-local" value={taskDate} onChange={e => setTaskDate(e.target.value)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setTaskOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleCreateTask} disabled={!taskTitle.trim()} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick appointment dialog */}
      <Dialog open={apptOpen} onOpenChange={setApptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo agendamento{selectedLead ? ` — ${selectedLead.name}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Horário</label>
                <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select value={apptType} onChange={e => setApptType(e.target.value as AppointmentType)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                {APPOINTMENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <textarea value={apptNotes} onChange={e => setApptNotes(e.target.value)} rows={2}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setApptOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleCreateAppt} disabled={!apptDate || !apptTime} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick follow-up dialog */}
      <Dialog open={fupOpen} onOpenChange={setFupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo follow-up{selectedLead ? ` — ${selectedLead.name}` : ""}</DialogTitle></DialogHeader>
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
              <button onClick={async () => {
                if (!selectedLead || !fupDate) return;
                await addFollowUp({
                  leadId: selectedLead.id,
                  scheduledAt: new Date(`${fupDate}T${fupTime}:00`).toISOString(),
                  notes: fupNotes,
                  assignedTo: selected?.assignedTo ?? user?.id ?? null,
                });
                setFupOpen(false); setFupDate(""); setFupTime("09:00"); setFupNotes("");
              }} disabled={!selectedLead || !fupDate}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Conversations;
