import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, MessageSquareWarning, Pencil, Send, Undo2 } from "lucide-react";
import { Lead } from "@/types/lead";
import { Conversation, Message } from "@/context/ConversationsContext";
import { Script } from "@/context/PlaybooksContext";
import { useScriptPanel } from "@/hooks/useScriptPanel";
import { missingVars, tokenizeTemplate } from "@/lib/scriptTemplate";
import { MOMENT_LABELS, ScriptSection, defaultOpenSections, parseScriptSections } from "@/lib/scriptMoments";

interface Props {
  lead: Lead;
  conversation: Conversation | null;
  messages: Message[];
}

type Vars = Record<string, string>;
type Use = (block: string, from: Script) => void;

/** Mensagem com as variáveis resolvidas; as sem valor ficam destacadas. */
const BlockText: React.FC<{ block: string; vars: Vars }> = ({ block, vars }) => (
  <p className="text-xs text-foreground whitespace-pre-wrap">
    {tokenizeTemplate(block, vars).map((seg, i) =>
      seg.kind === "missing" ? (
        <mark
          key={i}
          title="Falta preencher antes de enviar"
          className="bg-crm-warning-light text-crm-warning font-medium rounded px-0.5"
        >
          {seg.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{seg.text}</React.Fragment>
      )
    )}
  </p>
);

/**
 * Uma mensagem pronta. Completa → "Enviar" manda na hora.
 * Com algo a preencher → "Preencher" leva ao campo de texto; nunca sai com {dia1}.
 */
const MessageCard: React.FC<{
  block: string; vars: Vars; from: Script; onSend: Use; onEdit: Use;
}> = ({ block, vars, from, onSend, onEdit }) => {
  const missing = missingVars(block, vars);
  const complete = missing.length === 0;
  return (
    <li className="bg-muted/40 border border-border rounded-md p-2">
      <BlockText block={block} vars={vars} />
      <div className="mt-1.5 flex items-center gap-3">
        {complete ? (
          <>
            <button
              onClick={() => onSend(block, from)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
            >
              <Send className="w-3 h-3" /> Enviar
            </button>
            <button
              onClick={() => onEdit(block, from)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              title="Colocar no campo de mensagem para ajustar antes de enviar"
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
          </>
        ) : (
          <button
            onClick={() => onEdit(block, from)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded border border-crm-warning/50 text-crm-warning hover:bg-crm-warning-light"
            title={`Falta preencher: ${missing.map(m => `{${m}}`).join(", ")}`}
          >
            <Pencil className="w-3 h-3" /> Preencher e enviar
          </button>
        )}
      </div>
    </li>
  );
};

/** Um passo do atendimento: título clicável e suas mensagens. */
const StepCard: React.FC<{
  step: Script; open: boolean; onToggle: () => void; vars: Vars; onSend: Use; onEdit: Use;
}> = ({ step, open, onToggle, vars, onSend, onEdit }) => {
  const sections: ScriptSection[] = useMemo(() => parseScriptSections(step.content), [step.content]);
  const count = sections.reduce((n, s) => n + s.blocks.length, 0);
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1 text-[12px] font-semibold text-foreground hover:text-primary text-left py-1"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
        <span className="truncate">{step.name}</span>
        <span className="ml-auto text-[10px] font-normal text-muted-foreground">{count}</span>
      </button>
      {open && (
        <div className="mt-1 mb-2 space-y-2">
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{section.title}</p>
              )}
              <ul className="space-y-2">
                {section.blocks.map((block, j) => (
                  <MessageCard key={j} block={block} vars={vars} from={step} onSend={onSend} onEdit={onEdit} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Lista de passos com abrir/fechar. Lista curta nasce aberta; longa, só o 1º. */
const StepList: React.FC<{ steps: Script[]; vars: Vars; onSend: Use; onEdit: Use }> = ({ steps, vars, onSend, onEdit }) => {
  const initial = useMemo(
    () => defaultOpenSections(steps.map(s => ({
      title: s.name, blocks: parseScriptSections(s.content).flatMap(x => x.blocks),
    }))),
    [steps],
  );
  const [open, setOpen] = useState<boolean[]>(initial);
  useEffect(() => { setOpen(initial); }, [initial]);
  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <StepCard
          key={step.id}
          step={step}
          open={open[i] ?? true}
          onToggle={() => setOpen(prev => prev.map((v, j) => (j === i ? !v : v)))}
          vars={vars}
          onSend={onSend}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

const selectClass =
  "w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";

const ScriptPanel: React.FC<Props> = ({ lead, conversation, messages }) => {
  const {
    resolved, shownMoment, momentOverride, setMomentOverride, momentsWithSteps,
    trilhas, shownTrilha, setTrilhaOverride,
    steps, objections, detectedObjections, vars, insertBlock, sendBlock,
  } = useScriptPanel(lead, conversation, messages);

  const [objectionsOpen, setObjectionsOpen] = useState(false);
  const detectedIds = useMemo(() => new Set(detectedObjections.map(o => o.id)), [detectedObjections]);
  const otherObjections = objections.filter(o => !detectedIds.has(o.id));

  const autoLabel = resolved.moment ? MOMENT_LABELS[resolved.moment] : "sem momento";

  return (
    <div className="space-y-3">
      {/* Momento atual — o porquê dos passos que aparecem */}
      <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Momento</p>
        <p className="text-sm font-semibold text-foreground">
          {shownMoment ? MOMENT_LABELS[shownMoment] : "Sem script de funil"}
        </p>
        {!momentOverride && resolved.reason && <p className="text-[11px] text-muted-foreground">{resolved.reason}</p>}
        {momentOverride && (
          <button
            onClick={() => setMomentOverride(null)}
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <Undo2 className="w-3 h-3" /> Voltar ao automático ({autoLabel})
          </button>
        )}
      </div>

      {/* Objeção detectada na última mensagem da paciente */}
      {detectedObjections.length > 0 && (
        <div className="rounded-md border border-crm-warning/40 bg-crm-warning-light/60 p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-crm-warning mb-1">
            <MessageSquareWarning className="w-3.5 h-3.5" /> Objeção na última mensagem
          </p>
          <StepList steps={detectedObjections} vars={vars} onSend={sendBlock} onEdit={insertBlock} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Ver momento</label>
          <select
            value={momentOverride ?? ""}
            onChange={e => setMomentOverride((e.target.value || null) as typeof momentOverride)}
            className={selectClass}
          >
            <option value="">Automático — {autoLabel}</option>
            {momentsWithSteps.map(m => <option key={m} value={m}>{MOMENT_LABELS[m]}</option>)}
          </select>
        </div>
        {trilhas.length > 0 && (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Procedimento</label>
            <select
              value={shownTrilha ?? ""}
              onChange={e => setTrilhaOverride(e.target.value || null)}
              className={selectClass}
            >
              {!shownTrilha && <option value="">Escolha o procedimento…</option>}
              {trilhas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">
            {shownMoment
              ? `Nenhum script ativo para “${MOMENT_LABELS[shownMoment]}”`
              : "Este lead não tem script de funil. As objeções continuam abaixo."}
          </p>
          {shownMoment && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("crm:navigate", { detail: { tab: "playbooks" } }))}
              className="text-[11px] text-primary hover:underline mt-2"
            >
              Criar em Playbooks → Scripts
            </button>
          )}
        </div>
      ) : (
        <StepList steps={steps} vars={vars} onSend={sendBlock} onEdit={insertBlock} />
      )}

      {/* Objeções — valem em qualquer momento e nunca mudam a etapa */}
      {otherObjections.length > 0 && (
        <div className="border-t border-border pt-2">
          <button
            onClick={() => setObjectionsOpen(v => !v)}
            className="w-full flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground text-left"
          >
            {objectionsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Objeções
            <span className="ml-auto font-normal normal-case">{otherObjections.length}</span>
          </button>
          {objectionsOpen && (
            <div className="mt-1.5">
              <StepList steps={otherObjections} vars={vars} onSend={sendBlock} onEdit={insertBlock} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScriptPanel;
