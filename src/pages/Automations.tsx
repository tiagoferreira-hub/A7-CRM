import React, { useMemo, useState } from "react";
import { useFollowUps } from "@/context/FollowUpsContext";
import { useCampaigns } from "@/context/CampaignsContext";
import { useAutomationFlows } from "@/context/AutomationFlowsContext";
import { useLeads } from "@/context/LeadsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CAMPAIGN_CHANNEL_LABELS, CAMPAIGN_STATUS_LABELS, CampaignChannel, FLOW_ACTION_LABELS, FLOW_STATUS_LABELS, FLOW_TRIGGER_LABELS, FlowActionType, FlowTriggerType } from "@/types/automations";
import { Zap, Plus, Check, Trash2, Pause, Play, Mail, MessageCircle, Workflow } from "lucide-react";
import RemindersCard from "@/components/crm/RemindersCard";

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});

const Automations: React.FC = () => {
  const { followUps, addFollowUp, completeFollowUp, deleteFollowUp } = useFollowUps();
  const { campaigns, addCampaign, setCampaignStatus, deleteCampaign } = useCampaigns();
  const { flows, steps: flowSteps, addFlow, setFlowStatus, deleteFlow } = useAutomationFlows();
  const { leads } = useLeads();
  const members = useCompanyMembers();

  const [tab, setTab] = useState<"followups" | "campaigns" | "flows">("followups");
  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [campOpen, setCampOpen] = useState(false);
  const [campName, setCampName] = useState("");
  const [campChannel, setCampChannel] = useState<CampaignChannel>("whatsapp");
  const [campDate, setCampDate] = useState("");

  // Flow builder
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [flowTrigger, setFlowTrigger] = useState<FlowTriggerType>("no_reply_days");
  const [flowDays, setFlowDays] = useState(1);
  const [flowSteps2, setFlowSteps2] = useState<{ delayMinutes: number; actionType: FlowActionType; message: string }[]>([
    { delayMinutes: 0, actionType: "send_whatsapp", message: "" },
  ]);

  const handleCreateFlow = async () => {
    if (!flowName.trim()) return;
    await addFlow({
      name: flowName.trim(),
      triggerType: flowTrigger,
      triggerConfig: flowTrigger === "no_reply_days" ? { days: flowDays } : {},
      steps: flowSteps2.map((s, i) => ({
        orderIndex: i,
        delayMinutes: s.delayMinutes,
        actionType: s.actionType,
        actionConfig: { message: s.message },
      })),
    });
    setFlowOpen(false); setFlowName(""); setFlowTrigger("no_reply_days"); setFlowDays(1);
    setFlowSteps2([{ delayMinutes: 0, actionType: "send_whatsapp", message: "" }]);
  };

  const leadById = useMemo(() => Object.fromEntries(leads.map(l => [l.id, l])), [leads]);
  const memberById = useMemo(() => Object.fromEntries(members.map(m => [m.userId, m.displayName])), [members]);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return followUps.filter(f => f.status === "pendente" && new Date(f.scheduledAt) >= d && new Date(f.scheduledAt) <= e);
  }, [followUps]);
  const upcoming = useMemo(() => {
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return followUps.filter(f => f.status === "pendente" && new Date(f.scheduledAt) > e);
  }, [followUps]);
  const overdue = useMemo(() => followUps.filter(f => f.status === "atrasado"), [followUps]);

  const handleCreate = async () => {
    if (!leadId || !date) return;
    await addFollowUp({
      leadId,
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      notes,
      assignedTo: assignedTo || null,
    });
    setOpen(false); setLeadId(""); setDate(""); setTime("09:00"); setNotes(""); setAssignedTo("");
  };

  const handleCreateCampaign = async () => {
    if (!campName.trim()) return;
    await addCampaign({
      name: campName.trim(),
      channel: campChannel,
      scheduledAt: campDate ? new Date(campDate).toISOString() : null,
    });
    setCampOpen(false); setCampName(""); setCampChannel("whatsapp"); setCampDate("");
  };

  const FollowUpItem: React.FC<{ f: typeof followUps[number] }> = ({ f }) => {
    const lead = leadById[f.leadId];
    return (
      <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5 bg-card">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{lead?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {fmtDateTime(f.scheduledAt)} · {f.assignedTo ? memberById[f.assignedTo] ?? "—" : "Sem responsável"}
          </p>
          {f.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.notes}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {f.status !== "concluido" && (
            <button onClick={() => completeFollowUp(f.id)}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90">
              <Check className="w-3.5 h-3.5" /> Concluir
            </button>
          )}
          <button onClick={() => deleteFollowUp(f.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const Section: React.FC<{ title: string; items: typeof followUps; tone?: string }> = ({ title, items, tone }) => (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${tone ?? "text-muted-foreground"}`}>
        {title} <span className="ml-1 text-muted-foreground/70">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nada por aqui.</p>
      ) : (
        <div className="space-y-2">{items.map(f => <FollowUpItem key={f.id} f={f} />)}</div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Automações</h2>
          <nav className="flex items-center gap-1 bg-muted rounded-lg p-0.5 ml-4">
            <button onClick={() => setTab("followups")}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "followups" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >Follow-ups</button>
            <button onClick={() => setTab("campaigns")}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "campaigns" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >Disparos <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">em breve</span></button>
            <button onClick={() => setTab("flows")}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "flows" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >Fluxos <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">beta</span></button>
          </nav>
        </div>
        {tab === "followups" && (
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo follow-up
          </button>
        )}
        {tab === "campaigns" && (
          <button onClick={() => setCampOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo disparo
          </button>
        )}
        {tab === "flows" && (
          <button onClick={() => setFlowOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo fluxo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
        {tab === "followups" && (
          <>
            <RemindersCard />
            <Section title="Atrasados" items={overdue} tone="text-rose-600 dark:text-rose-400" />
            <Section title="Hoje" items={today} tone="text-primary" />
            <Section title="Próximos" items={upcoming} />
          </>
        )}

        {tab === "campaigns" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Estrutura preparada para disparos via WhatsApp e e-mail. Envio real será habilitado em breve.
            </p>
            {campaigns.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nenhum disparo cadastrado.</p>
            )}
            {campaigns.map(c => (
              <div key={c.id} className="border border-border rounded-lg p-4 bg-card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {c.channel === "whatsapp" ? <MessageCircle className="w-4 h-4 text-emerald-600" /> : <Mail className="w-4 h-4 text-blue-600" />}
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{CAMPAIGN_CHANNEL_LABELS[c.channel]}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">{CAMPAIGN_STATUS_LABELS[c.status]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.scheduledAt ? fmtDateTime(c.scheduledAt) : "Sem agendamento"} · Enviadas: {c.sentCount} · Respostas: {c.repliedCount}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.status === "ativo" ? (
                    <button onClick={() => setCampaignStatus(c.id, "pausado")} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
                      <Pause className="w-3.5 h-3.5" /> Pausar
                    </button>
                  ) : (
                    <button onClick={() => setCampaignStatus(c.id, "ativo")} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
                      <Play className="w-3.5 h-3.5" /> Ativar
                    </button>
                  )}
                  <button onClick={() => deleteCampaign(c.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "flows" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5" />
              Estrutura preparada para fluxos automáticos (gatilhos, delays e ações). Execução real será habilitada em breve.
            </p>
            {flows.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nenhum fluxo cadastrado ainda.</p>
            )}
            {flows.map(f => {
              const fSteps = flowSteps.filter(s => s.flowId === f.id);
              return (
                <div key={f.id} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Workflow className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{FLOW_TRIGGER_LABELS[f.triggerType]}{f.triggerType === "no_reply_days" && f.triggerConfig?.days ? ` · ${f.triggerConfig.days}d` : ""}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${f.status === "ativo" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{FLOW_STATUS_LABELS[f.status]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {f.status === "ativo" ? (
                        <button onClick={() => setFlowStatus(f.id, "pausado")} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
                          <Pause className="w-3.5 h-3.5" /> Pausar
                        </button>
                      ) : (
                        <button onClick={() => setFlowStatus(f.id, "ativo")} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
                          <Play className="w-3.5 h-3.5" /> Ativar
                        </button>
                      )}
                      <button onClick={() => deleteFlow(f.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {fSteps.length > 0 && (
                    <ol className="mt-3 space-y-1.5 pl-1">
                      {fSteps.map((s, i) => (
                        <li key={s.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-muted text-foreground text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <span>após <span className="font-medium text-foreground">{s.delayMinutes}min</span></span>
                          <span>→</span>
                          <span className="font-medium text-foreground">{FLOW_ACTION_LABELS[s.actionType]}</span>
                          {s.actionConfig?.message && <span className="truncate italic">"{s.actionConfig.message}"</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New flow dialog */}
      <Dialog open={flowOpen} onOpenChange={setFlowOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo fluxo de automação</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <input value={flowName} onChange={e => setFlowName(e.target.value)}
                placeholder="Ex.: Recuperar lead sem resposta"
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gatilho</label>
                <select value={flowTrigger} onChange={e => setFlowTrigger(e.target.value as FlowTriggerType)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                  {Object.entries(FLOW_TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {flowTrigger === "no_reply_days" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Dias sem responder</label>
                  <input type="number" min={1} value={flowDays} onChange={e => setFlowDays(parseInt(e.target.value) || 1)}
                    className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Ações em sequência</label>
                <button onClick={() => setFlowSteps2(prev => [...prev, { delayMinutes: 60, actionType: "send_whatsapp", message: "" }])}
                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-accent text-foreground">
                  <Plus className="w-3 h-3" /> Adicionar ação
                </button>
              </div>
              <div className="space-y-2">
                {flowSteps2.map((s, i) => (
                  <div key={i} className="border border-border rounded-md p-2.5 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground">Ação {i + 1}</span>
                      {flowSteps2.length > 1 && (
                        <button onClick={() => setFlowSteps2(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 rounded hover:bg-accent text-muted-foreground">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Delay (min)</label>
                        <input type="number" min={0} value={s.delayMinutes}
                          onChange={e => setFlowSteps2(prev => prev.map((x, j) => j === i ? { ...x, delayMinutes: parseInt(e.target.value) || 0 } : x))}
                          className="w-full text-xs border border-input rounded-md px-2 py-1 bg-background" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Ação</label>
                        <select value={s.actionType}
                          onChange={e => setFlowSteps2(prev => prev.map((x, j) => j === i ? { ...x, actionType: e.target.value as FlowActionType } : x))}
                          className="w-full text-xs border border-input rounded-md px-2 py-1 bg-background">
                          {Object.entries(FLOW_ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    {(s.actionType === "send_whatsapp" || s.actionType === "send_email" || s.actionType === "create_task") && (
                      <input value={s.message}
                        onChange={e => setFlowSteps2(prev => prev.map((x, j) => j === i ? { ...x, message: e.target.value } : x))}
                        placeholder={s.actionType === "create_task" ? "Título da tarefa" : "Mensagem"}
                        className="w-full text-xs border border-input rounded-md px-2 py-1 bg-background" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setFlowOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleCreateFlow} disabled={!flowName.trim()}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar fluxo</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New follow-up dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Lead</label>
              <select value={leadId} onChange={e => setLeadId(e.target.value)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Selecione...</option>
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
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Eu mesmo</option>
                {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observação</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleCreate} disabled={!leadId || !date}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New campaign dialog */}
      <Dialog open={campOpen} onOpenChange={setCampOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo disparo</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <input value={campName} onChange={e => setCampName(e.target.value)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Canal</label>
                <select value={campChannel} onChange={e => setCampChannel(e.target.value as CampaignChannel)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Agendamento</label>
                <input type="datetime-local" value={campDate} onChange={e => setCampDate(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setCampOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleCreateCampaign} disabled={!campName.trim()}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Automations;
