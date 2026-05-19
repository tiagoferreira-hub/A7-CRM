import React, { useState } from "react";
import { useAutomationFlows } from "@/context/AutomationFlowsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FLOW_ACTION_LABELS, FLOW_STATUS_LABELS, FLOW_TRIGGER_LABELS,
  FlowActionType, FlowTriggerType,
} from "@/types/automations";
import { GitBranch, Plus, Trash2, Pause, Play, Workflow, Sparkles, Clock, UserPlus, MessageSquare, RotateCcw, Users } from "lucide-react";

interface Template {
  key: string;
  name: string;
  icon: any;
  description: string;
  triggerType: FlowTriggerType;
  triggerConfig: any;
  steps: { delayMinutes: number; actionType: FlowActionType; message: string }[];
}

const TEMPLATES: Template[] = [
  {
    key: "no_reply",
    name: "Lead sem resposta",
    icon: Clock,
    description: "Reativa leads que não respondem após X dias.",
    triggerType: "no_reply_days",
    triggerConfig: { days: 2 },
    steps: [
      { delayMinutes: 0, actionType: "send_whatsapp", message: "Olá! Vi que ainda não conseguimos conversar. Posso te ajudar?" },
      { delayMinutes: 2880, actionType: "create_task", message: "Ligar para reativar lead" },
    ],
  },
  {
    key: "welcome",
    name: "Mensagem de boas-vindas",
    icon: MessageSquare,
    description: "Envia mensagem automática para novos leads.",
    triggerType: "lead_created",
    triggerConfig: {},
    steps: [
      { delayMinutes: 0, actionType: "send_whatsapp", message: "Olá! Obrigado pelo interesse. Em instantes um especialista irá te atender." },
    ],
  },
  {
    key: "auto_assign",
    name: "Atribuição automática",
    icon: UserPlus,
    description: "Distribui leads automaticamente entre vendedores.",
    triggerType: "lead_created",
    triggerConfig: {},
    steps: [
      { delayMinutes: 0, actionType: "assign", message: "" },
      { delayMinutes: 0, actionType: "notify", message: "Novo lead atribuído" },
    ],
  },
  {
    key: "auto_followup",
    name: "Follow-up automático",
    icon: Clock,
    description: "Cria follow-up após mudança de etapa.",
    triggerType: "stage_changed",
    triggerConfig: { stage: "hot_lead" },
    steps: [
      { delayMinutes: 1440, actionType: "create_task", message: "Realizar follow-up do lead" },
    ],
  },
  {
    key: "reactivation",
    name: "Reativação de lead",
    icon: RotateCcw,
    description: "Reativa leads frios após período de inatividade.",
    triggerType: "no_reply_days",
    triggerConfig: { days: 30 },
    steps: [
      { delayMinutes: 0, actionType: "send_whatsapp", message: "Olá! Faz um tempo que não falamos. Posso te apresentar nossas novidades?" },
      { delayMinutes: 4320, actionType: "change_stage", message: "lead_frio" },
    ],
  },
  {
    key: "distribute",
    name: "Distribuição de leads",
    icon: Users,
    description: "Distribui leads entre o time conforme regras.",
    triggerType: "lead_created",
    triggerConfig: {},
    steps: [
      { delayMinutes: 0, actionType: "assign", message: "" },
    ],
  },
];

const Workflows: React.FC = () => {
  const { flows, steps: flowSteps, addFlow, setFlowStatus, deleteFlow } = useAutomationFlows();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<FlowTriggerType>("no_reply_days");
  const [days, setDays] = useState(1);
  const [steps, setSteps] = useState<{ delayMinutes: number; actionType: FlowActionType; message: string }[]>([
    { delayMinutes: 0, actionType: "send_whatsapp", message: "" },
  ]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await addFlow({
      name: name.trim(),
      triggerType: trigger,
      triggerConfig: trigger === "no_reply_days" ? { days } : {},
      steps: steps.map((s, i) => ({
        orderIndex: i,
        delayMinutes: s.delayMinutes,
        actionType: s.actionType,
        actionConfig: { message: s.message },
      })),
    });
    setOpen(false); setName(""); setTrigger("no_reply_days"); setDays(1);
    setSteps([{ delayMinutes: 0, actionType: "send_whatsapp", message: "" }]);
  };

  const useTemplate = async (t: Template) => {
    await addFlow({
      name: t.name,
      triggerType: t.triggerType,
      triggerConfig: t.triggerConfig,
      steps: t.steps.map((s, i) => ({
        orderIndex: i,
        delayMinutes: s.delayMinutes,
        actionType: s.actionType,
        actionConfig: { message: s.message },
      })),
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Fluxos de Trabalho</h2>
          <span className="text-xs text-muted-foreground">Workflows, gatilhos e ações automatizadas</span>
        </div>
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" /> Novo fluxo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Modelos prontos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              return (
                <div key={t.key} className="border border-border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex-1 mb-3">{t.description}</p>
                  <button onClick={() => useTemplate(t)}
                    className="text-xs flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-border hover:bg-accent text-foreground">
                    <Plus className="w-3 h-3" /> Usar modelo
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Workflow className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Meus fluxos ({flows.length})</h3>
          </div>
          {flows.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Nenhum fluxo cadastrado. Use um modelo acima ou crie um novo.</p>
          )}
          <div className="space-y-3">
            {flows.map(f => {
              const fSteps = flowSteps.filter(s => s.flowId === f.id);
              return (
                <div key={f.id} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Workflow className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {FLOW_TRIGGER_LABELS[f.triggerType]}
                          {f.triggerType === "no_reply_days" && f.triggerConfig?.days ? ` · ${f.triggerConfig.days}d` : ""}
                        </span>
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
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo fluxo de trabalho</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex.: Recuperar lead sem resposta"
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gatilho</label>
                <select value={trigger} onChange={e => setTrigger(e.target.value as FlowTriggerType)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background">
                  {Object.entries(FLOW_TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {trigger === "no_reply_days" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Dias sem responder</label>
                  <input type="number" min={1} value={days} onChange={e => setDays(parseInt(e.target.value) || 1)}
                    className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Ações em sequência</label>
                <button onClick={() => setSteps(prev => [...prev, { delayMinutes: 60, actionType: "send_whatsapp", message: "" }])}
                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-accent">
                  <Plus className="w-3 h-3" /> Adicionar ação
                </button>
              </div>
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="border border-border rounded-md p-2.5 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground">Ação {i + 1}</span>
                      {steps.length > 1 && (
                        <button onClick={() => setSteps(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 rounded hover:bg-accent text-muted-foreground">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Delay (min)</label>
                        <input type="number" min={0} value={s.delayMinutes}
                          onChange={e => setSteps(prev => prev.map((x, j) => j === i ? { ...x, delayMinutes: parseInt(e.target.value) || 0 } : x))}
                          className="w-full text-xs border border-input rounded px-2 py-1 bg-background" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Ação</label>
                        <select value={s.actionType}
                          onChange={e => setSteps(prev => prev.map((x, j) => j === i ? { ...x, actionType: e.target.value as FlowActionType } : x))}
                          className="w-full text-xs border border-input rounded px-2 py-1 bg-background">
                          {Object.entries(FLOW_ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <textarea value={s.message}
                      onChange={e => setSteps(prev => prev.map((x, j) => j === i ? { ...x, message: e.target.value } : x))}
                      placeholder="Mensagem / configuração..." rows={2}
                      className="w-full text-xs border border-input rounded px-2 py-1 bg-background resize-none" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-accent">Cancelar</button>
              <button onClick={handleCreate} className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">Criar fluxo</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workflows;
