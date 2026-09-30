import React, { useEffect, useMemo, useState } from "react";
import {
  Clock, Instagram, KanbanSquare, MessageCircle, MessageCircleWarning, Plus, UserX, X,
} from "lucide-react";
import { useLeads } from "@/context/LeadsContext";
import { useConversations } from "@/context/ConversationsContext";
import { useFollowUps } from "@/context/FollowUpsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { LeadStage, STAGE_LABELS } from "@/types/lead";
import NewLeadModal from "@/components/crm/NewLeadModal";
import {
  ContactTab, contactCounts, contactRows, formatWait, stageCards, teamLoad, waitTier,
} from "@/lib/homeDashboard";

const TIER_TEXT = { fresh: "text-muted-foreground", warning: "text-crm-warning", danger: "text-destructive" } as const;

const TABS: { key: ContactTab; label: string; hint: string }[] = [
  { key: "owes", label: "Sem resposta", hint: "A paciente escreveu por último e a clínica ainda não respondeu" },
  { key: "open", label: "Abertas", hint: "Todas as conversas abertas" },
  { key: "unassigned", label: "Sem responsável", hint: "Conversas abertas sem ninguém atribuído" },
];

const initial = (name: string) => (name || "?").trim().charAt(0).toUpperCase();

/** Relógio da tela: recalcula as esperas a cada minuto. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const ChannelIcon: React.FC<{ channel: string }> = ({ channel }) =>
  channel === "instagram"
    ? <Instagram className="w-3 h-3 text-pink-500 shrink-0" />
    : <MessageCircle className="w-3 h-3 text-emerald-500 shrink-0" />;

const Stat: React.FC<{ icon: React.ReactNode; value: number; title: string; alert?: boolean }> = ({ icon, value, title, alert }) => (
  <span title={title} className={`inline-flex items-center gap-1 ${alert && value > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
    {icon}{value}
  </span>
);

const HomeDashboard: React.FC<{ onShowBoard?: () => void }> = ({ onShowBoard }) => {
  const { leads } = useLeads();
  const { conversations } = useConversations();
  const { followUps } = useFollowUps();
  const members = useCompanyMembers();
  const now = useNow();

  const [stage, setStage] = useState<LeadStage | null>(null);
  const [tab, setTab] = useState<ContactTab>("owes");
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  const cards = useMemo(() => stageCards(leads, conversations, followUps), [leads, conversations, followUps]);
  const counts = useMemo(() => contactCounts(leads, conversations, now, stage), [leads, conversations, now, stage]);
  const rows = useMemo(() => contactRows(leads, conversations, tab, now, stage), [leads, conversations, tab, now, stage]);
  const team = useMemo(() => teamLoad(members, conversations, now), [members, conversations, now]);
  const nameOf = useMemo(() => Object.fromEntries(members.map(m => [m.userId, m.displayName])), [members]);

  const openConversation = (leadId: string) =>
    window.dispatchEvent(new CustomEvent("crm:openConversationByLead", { detail: { leadId } }));

  return (
    <div className="min-h-full bg-background">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">
            Atualizado às {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onShowBoard && (
            <button
              onClick={onShowBoard}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-input text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Ver os leads em colunas por etapa, com arrastar e soltar"
            >
              <KanbanSquare className="w-4 h-4" /> Quadro
            </button>
          )}
          <button
            onClick={() => setNewLeadOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Etapas do funil */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Etapas do funil</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cards.map(c => {
              const active = stage === c.stage;
              return (
                <button
                  key={c.stage}
                  onClick={() => setStage(active ? null : c.stage)}
                  aria-pressed={active}
                  className={`min-w-[170px] flex-1 text-left rounded-xl border bg-card p-4 transition-colors ${
                    active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground whitespace-nowrap">{STAGE_LABELS[c.stage]}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{c.total}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <Stat icon={<MessageCircleWarning className="w-3.5 h-3.5" />} value={c.owesReply}
                      title="Esperando resposta da clínica" alert />
                    <Stat icon={<UserX className="w-3.5 h-3.5" />} value={c.unassigned} title="Sem responsável" />
                    <Stat icon={<Clock className="w-3.5 h-3.5" />} value={c.pendingFollowUp} title="Com follow-up pendente" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          {/* Contatos */}
          <section className="rounded-xl border border-border bg-card flex flex-col min-h-[320px]">
            <div className="px-5 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Contatos</h2>
                {stage && (
                  <button
                    onClick={() => setStage(null)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary"
                  >
                    {STAGE_LABELS[stage]} <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div role="tablist" className="flex gap-5 mt-3 border-b border-border">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={tab === t.key}
                    title={t.hint}
                    onClick={() => setTab(t.key)}
                    className={`pb-2 -mb-px text-sm border-b-2 transition-colors ${
                      tab === t.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label} <span className={t.key === "owes" && counts.owes > 0 ? "text-destructive font-semibold" : ""}>{counts[t.key]}</span>
                  </button>
                ))}
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-border">
              {rows.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {tab === "owes" ? "Ninguém esperando resposta. 👏" : "Nenhuma conversa aqui."}
                </li>
              )}
              {rows.map(r => (
                <li key={r.conversationId}>
                  <button
                    onClick={() => openConversation(r.leadId)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-accent/50"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {initial(r.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">{r.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                        <ChannelIcon channel={r.channel} />
                        <span className="truncate">{r.lastMessage || "—"}</span>
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span
                        className={`flex items-center justify-end gap-1 text-xs ${r.owesReply ? TIER_TEXT[waitTier(r.minutes)] : "text-muted-foreground"}`}
                        title={r.owesReply ? "Tempo esperando resposta da clínica" : "Desde a última mensagem"}
                      >
                        {formatWait(r.minutes)} <Clock className="w-3 h-3" />
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5 max-w-[140px] truncate">
                        {r.assignedTo ? (nameOf[r.assignedTo] ?? "—") : "Sem responsável"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Equipe */}
          <section className="rounded-xl border border-border bg-card flex flex-col min-h-[320px]">
            <h2 className="px-5 pt-4 pb-3 text-base font-semibold text-foreground border-b border-border">Equipe</h2>
            <ul className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-border">
              {team.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum membro na equipe.</li>
              )}
              {team.map(m => (
                <li key={m.userId} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                    {initial(m.displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground truncate">{m.displayName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {m.assigned} {m.assigned === 1 ? "contato atribuído" : "contatos atribuídos"}
                    </span>
                  </span>
                  <span className="text-right shrink-0 text-xs">
                    {m.owes > 0 ? (
                      <>
                        <span className="block font-semibold text-destructive">{m.owes} sem resposta</span>
                        <span className={`block ${TIER_TEXT[waitTier(m.longestWait)]}`}>
                          mais antiga: {formatWait(m.longestWait)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">em dia</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <NewLeadModal open={newLeadOpen} onClose={() => setNewLeadOpen(false)} />
    </div>
  );
};

export default HomeDashboard;
