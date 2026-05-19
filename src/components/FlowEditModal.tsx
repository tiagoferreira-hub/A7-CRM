import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAutomationFlows } from "@/context/AutomationFlowsContext";
import {
  AutomationFlow, FlowTriggerType, FlowActionType,
  FLOW_TRIGGER_LABELS, FLOW_ACTION_LABELS,
} from "@/types/automations";
import { Pause, Play, Plus, Trash2 } from "lucide-react";

interface Props {
  flow: AutomationFlow | null;
  open: boolean;
  onClose: () => void;
}

interface StepDraft { delayMinutes: number; actionType: FlowActionType; message: string }

const FlowEditModal: React.FC<Props> = ({ flow, open, onClose }) => {
  const { steps: allSteps, updateFlow, setFlowStatus, deleteFlow } = useAutomationFlows();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<FlowTriggerType>("no_reply_days");
  const [days, setDays] = useState(1);
  const [steps, setSteps] = useState<StepDraft[]>([]);

  useEffect(() => {
    if (flow) {
      setName(flow.name);
      setTrigger(flow.triggerType);
      setDays(flow.triggerConfig?.days ?? 1);
      const fSteps = allSteps
        .filter(s => s.flowId === flow.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(s => ({
          delayMinutes: s.delayMinutes,
          actionType: s.actionType,
          message: s.actionConfig?.message ?? "",
        }));
      setSteps(fSteps.length ? fSteps : [{ delayMinutes: 0, actionType: "send_whatsapp", message: "" }]);
    }
  }, [flow, allSteps]);

  if (!flow) return null;

  const save = async () => {
    await updateFlow(flow.id, {
      name: name.trim() || flow.name,
      triggerType: trigger,
      triggerConfig: trigger === "no_reply_days" ? { days } : {},
      steps: steps.map((s, i) => ({
        orderIndex: i,
        delayMinutes: s.delayMinutes,
        actionType: s.actionType,
        actionConfig: { message: s.message },
      })),
    });
    onClose();
  };
  const toggle = async () => {
    const next = flow.status === "ativo" ? "pausado" : "ativo";
    await setFlowStatus(flow.id, next);
    onClose();
  };
  const remove = async () => {
    if (!confirm("Excluir este fluxo?")) return;
    await deleteFlow(flow.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-xl shadow-lg">
        <DialogHeader><DialogTitle>Editar fluxo</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Gatilho</label>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value as FlowTriggerType)}
                className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background">
                {Object.entries(FLOW_TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {trigger === "no_reply_days" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Dias sem responder</label>
                <input type="number" min={1} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                  className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background" />
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
                        onChange={(e) => setSteps(prev => prev.map((x, j) => j === i ? { ...x, delayMinutes: parseInt(e.target.value) || 0 } : x))}
                        className="w-full text-xs border border-input rounded px-2 py-1 bg-background" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Ação</label>
                      <select value={s.actionType}
                        onChange={(e) => setSteps(prev => prev.map((x, j) => j === i ? { ...x, actionType: e.target.value as FlowActionType } : x))}
                        className="w-full text-xs border border-input rounded px-2 py-1 bg-background">
                        {Object.entries(FLOW_ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea value={s.message}
                    onChange={(e) => setSteps(prev => prev.map((x, j) => j === i ? { ...x, message: e.target.value } : x))}
                    placeholder="Mensagem / configuração..." rows={2}
                    className="w-full text-xs border border-input rounded px-2 py-1 bg-background resize-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border mt-2">
          <button onClick={remove} className="inline-flex items-center gap-1.5 text-sm h-10 px-3 rounded-lg text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
          <div className="flex gap-2">
            <button onClick={toggle} className="inline-flex items-center gap-1.5 text-sm h-10 px-3 rounded-lg border border-input hover:bg-accent">
              {flow.status === "ativo" ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Ativar</>}
            </button>
            <button onClick={onClose} className="text-sm h-10 px-3 rounded-lg border border-input hover:bg-accent">Cancelar</button>
            <button onClick={save} className="text-sm h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Salvar</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlowEditModal;
