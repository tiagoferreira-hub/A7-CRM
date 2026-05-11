import React, { useEffect, useMemo, useState } from "react";
import { useConversations, Message } from "@/context/ConversationsContext";
import { useLeads } from "@/context/LeadsContext";
import { useAuth } from "@/context/AuthContext";
import { ORIGIN_LABELS, STAGE_LABELS, LeadOrigin, LeadStage } from "@/types/lead";
import { Search, Send, Filter, Phone, Circle } from "lucide-react";
import LeadDetailModal from "@/components/crm/LeadDetailModal";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterMine, setFilterMine] = useState(false);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

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
                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{STAGE_LABELS[selectedLead.stage]}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{ORIGIN_LABELS[selectedLead.origin]}</span>
              </div>
            </header>

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

      {openLeadId && (
        <LeadDetailModal leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
      )}
    </div>
  );
};

export default Conversations;
