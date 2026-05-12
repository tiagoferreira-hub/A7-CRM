import React, { useEffect, useMemo, useState } from "react";
import { useConversations, Message } from "@/context/ConversationsContext";
import { useLeads } from "@/context/LeadsContext";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TasksContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { ORIGIN_LABELS, STAGE_LABELS } from "@/types/lead";
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPE_OPTIONS, AppointmentType } from "@/types/appointment";
import { Search, Send, Phone, CheckSquare, CalendarPlus } from "lucide-react";
import LeadDetailModal from "@/components/crm/LeadDetailModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const Conversations: React.FC = () => {
  const { conversations, loadMessages, sendMessage, markRead } = useConversations();
  const { leads } = useLeads();
  const { user } = useAuth();
  const { addTask } = useTasks();
  const { addAppointment, appointments } = useAppointments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterMine, setFilterMine] = useState(false);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [apptOpen, setApptOpen] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("09:00");
  const [apptType, setApptType] = useState<AppointmentType>("avaliacao");
  const [apptNotes, setApptNotes] = useState("");

  const leadById = useMemo(() => Object.fromEntries(leads.map(l => [l.id, l])), [leads]);

  const filtered = useMemo(() => {
    return conversations.filter(c => {
      const lead = leadById[c.leadId];
      if (!lead) return false;
      if (filterUnread && c.unreadCount === 0) return false;
      if (filterStage !== "all" && lead.stage !== filterStage) return false;
      if (filterOrigin !== "all" && lead.origin !== filterOrigin) return false;
      if (filterMine && c.assignedTo !== user?.id) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!lead.name.toLowerCase().includes(s) && !lead.phone.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [conversations, leadById, search, filterUnread, filterStage, filterOrigin, filterMine, user]);

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
            <button
              onClick={() => setFilterUnread(v => !v)}
              className={`text-xs px-2 py-1 rounded-md border ${filterUnread ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >Não lidos</button>
            <button
              onClick={() => setFilterMine(v => !v)}
              className={`text-xs px-2 py-1 rounded-md border ${filterMine ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >Meus</button>
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              className="text-xs px-1.5 py-1 rounded-md border border-border bg-card text-foreground"
            >
              <option value="all">Etapa</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={filterOrigin}
              onChange={e => setFilterOrigin(e.target.value)}
              className="text-xs px-1.5 py-1 rounded-md border border-border bg-card text-foreground"
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
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-border flex gap-3 items-start hover:bg-accent transition-colors ${isActive ? "bg-accent" : ""}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage || "—"}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {c.unreadCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium">Não lido</span>
                    )}
                    {c.assignedTo && c.unreadCount === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">Em atendimento</span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{STAGE_LABELS[lead.stage]}</span>
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
            <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTaskOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-accent"
                ><CheckSquare className="w-3.5 h-3.5" /> Tarefa</button>
                <button
                  onClick={() => setApptOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                ><CalendarPlus className="w-3.5 h-3.5" /> Agendar</button>
                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{STAGE_LABELS[selectedLead.stage]}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{ORIGIN_LABELS[selectedLead.origin]}</span>
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
    </div>
  );
};

export default Conversations;
