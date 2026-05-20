import React, { useMemo } from "react";
import { UserRound, Phone, Paperclip, Clock, ExternalLink, Image as ImageIcon, FileText, Link as LinkIcon } from "lucide-react";
import { Lead, STAGE_LABELS, ORIGIN_LABELS } from "@/types/lead";
import { Conversation, Message } from "@/context/ConversationsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useTags } from "@/context/TagsContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useFollowUps } from "@/context/FollowUpsContext";
import { useTasks } from "@/context/TasksContext";
import { useLeadHistory } from "@/hooks/useLeadHistory";
import { APPOINTMENT_TYPE_LABELS } from "@/types/appointment";
import { cn } from "@/lib/utils";

export type RightPanelKey = "details" | "calls" | "attachments" | "activities";

interface Props {
  lead: Lead | null;
  conversation: Conversation | null;
  messages: Message[];
  activePanel: RightPanelKey | null;
  onSelectPanel: (p: RightPanelKey | null) => void;
  onOpenLifecycle: () => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const IMG_REGEX = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;
const FILE_REGEX = /\.(pdf|docx?|xlsx?|csv|zip|txt)(\?.*)?$/i;

const ConversationRightSidebar: React.FC<Props> = ({
  lead, conversation, messages, activePanel, onSelectPanel, onOpenLifecycle,
}) => {
  const members = useCompanyMembers();
  const { tagsForLead } = useTags();
  const { appointments } = useAppointments();
  const { followUps } = useFollowUps();
  const { tasks } = useTasks();
  const history = useLeadHistory(lead?.id);

  const owner = lead?.assignedTo ? members.find(m => m.userId === lead.assignedTo) : null;
  const leadTags = lead ? tagsForLead(lead.id) : [];

  const attachments = useMemo(() => {
    const images: string[] = [];
    const docs: string[] = [];
    const links: string[] = [];
    messages.forEach(m => {
      const matches = m.body.match(URL_REGEX) ?? [];
      matches.forEach(url => {
        if (IMG_REGEX.test(url)) images.push(url);
        else if (FILE_REGEX.test(url)) docs.push(url);
        else links.push(url);
      });
    });
    return { images, docs, links };
  }, [messages]);

  const activities = useMemo(() => {
    if (!lead) return [];
    type Ev = { id: string; ts: string; type: string; label: string; color: string };
    const ev: Ev[] = [];
    history.forEach(h => {
      if (h.eventType === "stage_changed") {
        ev.push({
          id: h.id, ts: h.createdAt, type: "stage",
          label: `Etapa: ${STAGE_LABELS[(h.payload as any)?.from] ?? "—"} → ${STAGE_LABELS[(h.payload as any)?.to] ?? "—"}`,
          color: "bg-crm-info-light text-crm-info",
        });
      } else if (h.eventType === "created") {
        ev.push({ id: h.id, ts: h.createdAt, type: "created", label: "Lead criado", color: "bg-muted text-muted-foreground" });
      }
    });
    appointments.filter(a => a.leadId === lead.id).forEach(a => {
      ev.push({
        id: `appt-${a.id}`, ts: a.scheduledAt, type: "appointment",
        label: `Agendamento: ${APPOINTMENT_TYPE_LABELS[a.type]}`,
        color: "bg-crm-purple-light text-crm-purple",
      });
    });
    followUps.filter(f => f.leadId === lead.id).forEach(f => {
      ev.push({
        id: `fup-${f.id}`, ts: f.scheduledAt, type: "followup",
        label: `Follow-up ${f.status === "concluido" ? "concluído" : "agendado"}`,
        color: "bg-crm-warning-light text-crm-warning",
      });
    });
    tasks.filter(t => t.leadId === lead.id).forEach(t => {
      ev.push({
        id: `task-${t.id}`, ts: t.dueDate ?? new Date().toISOString(), type: "task",
        label: `Tarefa: ${t.title}`,
        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      });
    });
    if (conversation) {
      ev.push({
        id: `conv-${conversation.id}-${conversation.status}`,
        ts: conversation.lastMessageAt,
        type: "conversation",
        label: conversation.status === "closed" ? "Conversa fechada" : "Conversa aberta",
        color: conversation.status === "closed"
          ? "bg-muted text-muted-foreground"
          : "bg-crm-success-light text-crm-success",
      });
    }
    return ev.sort((a, b) => b.ts.localeCompare(a.ts));
  }, [lead, history, appointments, followUps, tasks, conversation]);

  const icons: { key: RightPanelKey; icon: any; label: string }[] = [
    { key: "details", icon: UserRound, label: "Detalhes" },
    { key: "calls", icon: Phone, label: "Chamadas" },
    { key: "attachments", icon: Paperclip, label: "Anexos" },
    { key: "activities", icon: Clock, label: "Atividades" },
  ];

  const handleClick = (k: RightPanelKey) => {
    onSelectPanel(activePanel === k ? null : k);
  };

  return (
    <>
      {/* Slide-in panel — absolute over content */}
      {activePanel && lead && (
        <div className="absolute top-0 right-12 bottom-0 w-[280px] bg-card border-l border-border shadow-xl z-30 flex flex-col animate-in slide-in-from-right-2 duration-200">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {icons.find(i => i.key === activePanel)?.label}
            </h3>
            <button
              onClick={() => onSelectPanel(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
              title="Fechar"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-sm">
            {activePanel === "details" && (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Nome</div>
                  <div className="text-foreground">{lead.name}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Telefone</div>
                  <div className="text-foreground">{lead.phone}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Canal</div>
                  <div className="text-foreground capitalize">{conversation?.channel ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Etapa</div>
                  <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Origem</div>
                  <div className="text-foreground">{ORIGIN_LABELS[lead.origin]}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Serviço</div>
                  <div className="text-foreground">{lead.service || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Valor</div>
                  <div className="text-foreground font-semibold text-primary">{formatCurrency(lead.value)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Responsável</div>
                  <div className="text-foreground">{owner?.displayName ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {leadTags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {leadTags.map(t => (
                      <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Observações</div>
                  <div className="text-foreground whitespace-pre-wrap text-xs">{lead.observations || "—"}</div>
                </div>
              </div>
            )}

            {activePanel === "calls" && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                <Phone className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm font-medium">Em breve</p>
                <p className="text-xs mt-1">Chamadas estarão disponíveis em breve.</p>
              </div>
            )}

            {activePanel === "attachments" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" /> Imagens
                  </h4>
                  {attachments.images.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum anexo ainda</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {attachments.images.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-md overflow-hidden border border-border">
                          <img src={u} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Documentos
                  </h4>
                  {attachments.docs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum anexo ainda</p>
                  ) : (
                    <ul className="space-y-1">
                      {attachments.docs.map((u, i) => (
                        <li key={i}>
                          <a href={u} target="_blank" rel="noreferrer" className="text-xs text-primary truncate flex items-center gap-1.5 hover:underline">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{u.split("/").pop()}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3" /> Links
                  </h4>
                  {attachments.links.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum anexo ainda</p>
                  ) : (
                    <ul className="space-y-1">
                      {attachments.links.map((u, i) => (
                        <li key={i}>
                          <a href={u} target="_blank" rel="noreferrer" className="text-xs text-primary truncate block hover:underline">{u}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activePanel === "activities" && (
              <div>
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma atividade ainda</p>
                ) : (
                  <ol className="relative border-l border-border ml-2 space-y-3">
                    {activities.map(a => (
                      <li key={a.id} className="pl-4 relative">
                        <span className={cn("absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-2 ring-card", a.color)} />
                        <div className="text-xs text-foreground font-medium">{a.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(a.ts)}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
          {activePanel === "details" && (
            <div className="border-t border-border p-3">
              <button
                onClick={onOpenLifecycle}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium h-9 rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ver no Lifecycle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Icon rail — fixed 48px */}
      <aside className="w-12 shrink-0 border-l border-border bg-card flex flex-col items-center py-3 gap-1 z-40">
        {icons.map(({ key, icon: Icon, label }) => {
          const active = activePanel === key;
          return (
            <button
              key={key}
              onClick={() => handleClick(key)}
              title={label}
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </aside>
    </>
  );
};

export default ConversationRightSidebar;
