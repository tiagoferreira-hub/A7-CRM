import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Copy, MessageSquareWarning, Undo2 } from "lucide-react";
import { Lead } from "@/types/lead";
import { Conversation, Message } from "@/context/ConversationsContext";
import { Script } from "@/context/PlaybooksContext";
import { useScriptPanel } from "@/hooks/useScriptPanel";
import { tokenizeTemplate } from "@/lib/scriptTemplate";
import {
  ALL_MOMENTS, MOMENT_LABELS, ScriptSection, defaultOpenSections, parseScriptSections,
} from "@/lib/scriptMoments";

interface Props {
  lead: Lead;
  conversation: Conversation | null;
  messages: Message[];
}

/** Bloco com as variáveis resolvidas; as sem valor ficam destacadas. */
const BlockText: React.FC<{ block: string; vars: Record<string, string> }> = ({ block, vars }) => (
  <p className="text-xs text-foreground whitespace-pre-wrap">
    {tokenizeTemplate(block, vars).map((seg, i) =>
      seg.kind === "missing" ? (
        <mark
          key={i}
          title="Variável sem valor — preencha antes de enviar"
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

const BlockList: React.FC<{
  blocks: string[];
  vars: Record<string, string>;
  onUse: (block: string) => void;
}> = ({ blocks, vars, onUse }) => (
  <ul className="space-y-2">
    {blocks.map((block, i) => (
      <li key={i} className="bg-muted/40 border border-border rounded-md p-2">
        <BlockText block={block} vars={vars} />
        <button
          onClick={() => onUse(block)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <Copy className="w-3 h-3" /> Usar
        </button>
      </li>
    ))}
  </ul>
);

/** Seções de um script. Títulos (`# ...`) orientam e abrem/fecham; nunca são inseridos. */
const SectionList: React.FC<{
  sections: ScriptSection[];
  open: boolean[];
  onToggle: (index: number) => void;
  vars: Record<string, string>;
  onUse: (block: string) => void;
}> = ({ sections, open, onToggle, vars, onUse }) => (
  <div className="space-y-3">
    {sections.map((section, i) => {
      const isOpen = open[i] ?? true;
      return (
        <div key={i}>
          {section.title !== null && (
            <button
              onClick={() => onToggle(i)}
              className="w-full flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground mb-1.5 text-left"
            >
              {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
              <span className="truncate">{section.title}</span>
              {!isOpen && <span className="ml-auto font-normal normal-case">{section.blocks.length}</span>}
            </button>
          )}
          {isOpen && <BlockList blocks={section.blocks} vars={vars} onUse={onUse} />}
        </div>
      );
    })}
  </div>
);

/** Uma objeção: nome clicável que abre as respostas. */
const ObjectionItem: React.FC<{
  script: Script;
  defaultOpen: boolean;
  vars: Record<string, string>;
  onUse: (block: string, from: Script) => void;
}> = ({ script, defaultOpen, vars, onUse }) => {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [defaultOpen]);
  const blocks = useMemo(
    () => parseScriptSections(script.content).flatMap(s => s.blocks),
    [script.content],
  );
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary text-left py-1"
      >
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <span className="truncate">{script.name}</span>
      </button>
      {open && <div className="mt-1 mb-2"><BlockList blocks={blocks} vars={vars} onUse={b => onUse(b, script)} /></div>}
    </div>
  );
};

const ScriptPanel: React.FC<Props> = ({ lead, conversation, messages }) => {
  const {
    scripts, resolved, activeScript, overrideId, setOverrideId,
    sections, objections, detectedObjections, vars, insertBlock,
  } = useScriptPanel(lead, conversation, messages);

  const [open, setOpen] = useState<boolean[]>([]);
  useEffect(() => {
    setOpen(defaultOpenSections(sections, vars.procedimento));
  }, [sections, vars.procedimento]);
  const toggle = (i: number) => setOpen(prev => prev.map((v, j) => (j === i ? !v : v)));

  const [objectionsOpen, setObjectionsOpen] = useState(false);
  const detectedIds = useMemo(() => new Set(detectedObjections.map(o => o.id)), [detectedObjections]);
  const otherObjections = objections.filter(o => !detectedIds.has(o.id));

  // Seletor agrupado por momento, na ordem do atendimento.
  const grouped = useMemo(
    () => ALL_MOMENTS
      .map(m => ({ moment: m, items: scripts.filter(s => s.moment === m) }))
      .filter(g => g.items.length > 0),
    [scripts],
  );

  const momentLabel = resolved.moment ? MOMENT_LABELS[resolved.moment] : null;

  return (
    <div className="space-y-3">
      {/* Momento atual — o porquê do script que aparece */}
      <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Momento</p>
        <p className="text-sm font-semibold text-foreground">{momentLabel ?? "Sem script de funil"}</p>
        {resolved.reason && <p className="text-[11px] text-muted-foreground">{resolved.reason}</p>}
      </div>

      {/* Objeção detectada na última mensagem da paciente */}
      {detectedObjections.length > 0 && (
        <div className="rounded-md border border-crm-warning/40 bg-crm-warning-light/60 p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-crm-warning mb-1">
            <MessageSquareWarning className="w-3.5 h-3.5" /> Objeção na última mensagem
          </p>
          {detectedObjections.map(o => (
            <ObjectionItem key={o.id} script={o} defaultOpen vars={vars} onUse={insertBlock} />
          ))}
        </div>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Script</label>
        <select
          value={overrideId ?? ""}
          onChange={e => setOverrideId(e.target.value || null)}
          className="w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Automático{momentLabel ? ` — ${momentLabel}` : ""}</option>
          {grouped.map(g => (
            <optgroup key={g.moment} label={MOMENT_LABELS[g.moment]}>
              {g.items.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.isActive ? " •" : ""}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {overrideId && (
          <button
            onClick={() => setOverrideId(null)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <Undo2 className="w-3 h-3" /> Voltar ao automático
          </button>
        )}
      </div>

      {!activeScript ? (
        <div className="text-center py-6 text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">
            {resolved.moment
              ? `Nenhum script ativo para “${momentLabel}”`
              : "Este lead não tem script de funil. As objeções continuam abaixo."}
          </p>
          {resolved.moment && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("crm:navigate", { detail: { tab: "playbooks" } }))}
              className="text-[11px] text-primary hover:underline mt-2"
            >
              Criar em Playbooks → Scripts
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">{activeScript.name}</p>
          {sections.length === 0 ? (
            <p className="text-xs text-muted-foreground">Script sem conteúdo.</p>
          ) : (
            <SectionList
              sections={sections}
              open={open}
              onToggle={toggle}
              vars={vars}
              onUse={b => insertBlock(b, activeScript)}
            />
          )}
        </div>
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
              {otherObjections.map(o => (
                <ObjectionItem key={o.id} script={o} defaultOpen={false} vars={vars} onUse={insertBlock} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScriptPanel;
