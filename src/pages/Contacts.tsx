import React, { useMemo, useState } from "react";
import { useLeads } from "@/context/LeadsContext";
import { useTags } from "@/context/TagsContext";
import { useConversations } from "@/context/ConversationsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { ORIGIN_LABELS, STAGE_LABELS, STAGE_ALL, STAGE_ORDER, LeadStage, Lead } from "@/types/lead";
import { Users, Search, Plus, Filter } from "lucide-react";
import LeadDetailModal from "@/components/crm/LeadDetailModal";
import NewLeadModal from "@/components/crm/NewLeadModal";

const formatRelative = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const Contacts: React.FC = () => {
  const { leads } = useLeads();
  const { tags, assignments } = useTags();
  const { conversations } = useConversations();
  const members = useCompanyMembers();
  const memberById = useMemo(() => Object.fromEntries(members.map(m => [m.userId, m.displayName])), [members]);

  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showNew, setShowNew] = useState(false);

  const tagsByLead = useMemo(() => {
    const map: Record<string, { id: string; name: string; color: string }[]> = {};
    assignments.forEach(a => {
      const tag = tags.find(t => t.id === a.tagId);
      if (!tag) return;
      if (!map[a.leadId]) map[a.leadId] = [];
      map[a.leadId].push(tag);
    });
    return map;
  }, [assignments, tags]);

  const convByLead = useMemo(() => {
    const map: Record<string, typeof conversations[number]> = {};
    conversations.forEach(c => {
      const existing = map[c.leadId];
      if (!existing || c.lastMessageAt > existing.lastMessageAt) map[c.leadId] = c;
    });
    return map;
  }, [conversations]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (search) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.phone.toLowerCase().includes(q)) return false;
      }
      if (filterStage && l.stage !== filterStage) return false;
      if (filterAssignee === "__none__" && l.assignedTo) return false;
      if (filterAssignee && filterAssignee !== "__none__" && l.assignedTo !== filterAssignee) return false;
      if (filterTag && !tagsByLead[l.id]?.some(t => t.id === filterTag)) return false;
      return true;
    });
  }, [leads, search, filterStage, filterAssignee, filterTag, tagsByLead]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Contatos</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} contatos</span>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" /> Novo contato
        </button>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Buscar por nome ou telefone..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        <select className="text-sm border border-input rounded-md px-3 py-1.5 bg-background"
          value={filterStage} onChange={e => setFilterStage(e.target.value as LeadStage | "")}>
          <option value="">Todas as etapas</option>
          {STAGE_ALL.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select className="text-sm border border-input rounded-md px-3 py-1.5 bg-background"
          value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">Todas as tags</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="text-sm border border-input rounded-md px-3 py-1.5 bg-background"
          value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          <option value="__none__">Sem responsável</option>
          {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Nome</th>
              <th className="text-left px-4 py-2.5 font-medium">Telefone</th>
              <th className="text-left px-4 py-2.5 font-medium">Etapa</th>
              <th className="text-left px-4 py-2.5 font-medium">Tags</th>
              <th className="text-left px-4 py-2.5 font-medium">Responsável</th>
              <th className="text-left px-4 py-2.5 font-medium">Última mensagem</th>
              <th className="text-left px-4 py-2.5 font-medium">Conversa</th>
              <th className="text-left px-4 py-2.5 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground italic">Nenhum contato encontrado.</td></tr>
            )}
            {filtered.map(l => {
              const conv = convByLead[l.id];
              const ltags = tagsByLead[l.id] ?? [];
              return (
                <tr key={l.id} onClick={() => setSelected(l)}
                  className="border-b border-border hover:bg-muted/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{l.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.phone}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{STAGE_LABELS[l.stage]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {ltags.slice(0, 3).map(t => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ background: t.color }}>{t.name}</span>
                      ))}
                      {ltags.length > 3 && <span className="text-[10px] text-muted-foreground">+{ltags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.assignedTo ? memberById[l.assignedTo] ?? "—" : <span className="italic">—</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{l.lastMessage || "—"}</td>
                  <td className="px-4 py-3">
                    {conv ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded ${conv.awaitingReply ? "bg-amber-500/15 text-amber-700" : conv.isUnread || conv.unreadCount > 0 ? "bg-rose-500/15 text-rose-700" : "bg-muted text-muted-foreground"}`}>
                        {conv.awaitingReply ? "Aguardando" : conv.isUnread || conv.unreadCount > 0 ? "Não lida" : "Em dia"}
                      </span>
                    ) : <span className="text-[10px] text-muted-foreground italic">Sem conversa</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelative(l.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LeadDetailModal lead={selected} open={!!selected} onClose={() => setSelected(null)} />
      <NewLeadModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
};

export default Contacts;
