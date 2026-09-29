import React, { useMemo, useState } from "react";
import { usePlaybooks, Playbook, PlaybookSection, PlaybookFlowNode, PlaybookViewMode, Script, ScriptInput } from "@/context/PlaybooksContext";
import { useLeads } from "@/context/LeadsContext";
import { STAGE_ALL, STAGE_LABELS, LeadStage } from "@/types/lead";
import { ALL_MOMENTS, MOMENT_LABELS, ScriptMoment, byPosition, homeStageOf } from "@/lib/scriptMoments";
import { BookOpen, Plus, ChevronLeft, FileText, GitBranch, Trash2, Pencil, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SubTab = "playbooks" | "scripts" | "results";

const formatDate = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const Playbooks: React.FC = () => {
  const [sub, setSub] = useState<SubTab>("playbooks");
  const [openPlaybookId, setOpenPlaybookId] = useState<string | null>(null);

  if (openPlaybookId) {
    return <PlaybookEditor id={openPlaybookId} onBack={() => setOpenPlaybookId(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="px-6 py-5 border-b border-border bg-card">
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Playbooks
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Documente processos comerciais e scripts de atendimento.</p>
        <div className="flex gap-1 mt-4 border-b border-border -mb-5">
          {([
            ["playbooks", "Playbooks"],
            ["scripts", "Scripts"],
            ["results", "Resultados"],
          ] as [SubTab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setSub(k)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${sub === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {sub === "playbooks" && <PlaybooksList onOpen={setOpenPlaybookId} />}
        {sub === "scripts" && <ScriptsList />}
        {sub === "results" && <ResultsList />}
      </div>
    </div>
  );
};

/* ---------- Playbooks list ---------- */
const PlaybooksList: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const { playbooks, createPlaybook, deletePlaybook } = usePlaybooks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [mode, setMode] = useState<PlaybookViewMode>("document");

  const handleCreate = async () => {
    if (!title.trim()) return;
    const pb = await createPlaybook({ title: title.trim(), description: desc.trim(), viewMode: mode });
    setTitle(""); setDesc(""); setMode("document"); setOpen(false);
    if (pb) onOpen(pb.id);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" /> Novo Playbook
        </button>
      </div>
      {playbooks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum playbook criado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors group">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate flex-1">{p.title}</h3>
                <button onClick={() => { if (confirm("Excluir este playbook?")) deletePlaybook(p.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">{p.description || "Sem descrição"}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-muted-foreground">{formatDate(p.createdAt)}</span>
                <button onClick={() => onOpen(p.id)} className="text-xs font-medium text-primary hover:underline">Abrir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Playbook</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Título</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Modo padrão</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setMode("document")}
                  className={`flex-1 text-xs font-medium px-3 py-2 rounded-md border ${mode === "document" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <FileText className="w-3.5 h-3.5 inline mr-1" /> Documento
                </button>
                <button onClick={() => setMode("flow")}
                  className={`flex-1 text-xs font-medium px-3 py-2 rounded-md border ${mode === "flow" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <GitBranch className="w-3.5 h-3.5 inline mr-1" /> Fluxo
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleCreate} disabled={!title.trim()} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- Playbook editor (document/flow) ---------- */
const PlaybookEditor: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { playbooks, updatePlaybook } = usePlaybooks();
  const playbook = playbooks.find(p => p.id === id);
  const [mode, setMode] = useState<PlaybookViewMode>(playbook?.viewMode ?? "document");

  if (!playbook) return (
    <div className="p-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Voltar</button>
      <p className="mt-4 text-sm text-muted-foreground">Playbook não encontrado.</p>
    </div>
  );

  const sections = playbook.sections;
  const flowNodes = playbook.flowNodes;

  const addSection = () => {
    const s: PlaybookSection = { id: crypto.randomUUID(), title: "Nova seção", content: "" };
    updatePlaybook(id, { sections: [...sections, s] });
  };
  const updateSection = (sid: string, patch: Partial<PlaybookSection>) => {
    updatePlaybook(id, { sections: sections.map(s => s.id === sid ? { ...s, ...patch } : s) });
  };
  const removeSection = (sid: string) => {
    updatePlaybook(id, { sections: sections.filter(s => s.id !== sid) });
  };

  const addNode = (parentId: string | null) => {
    const n: PlaybookFlowNode = { id: crypto.randomUUID(), parentId, situation: "Cliente disse...", response: "Responda..." };
    updatePlaybook(id, { flowNodes: [...flowNodes, n] });
  };
  const updateNode = (nid: string, patch: Partial<PlaybookFlowNode>) => {
    updatePlaybook(id, { flowNodes: flowNodes.map(n => n.id === nid ? { ...n, ...patch } : n) });
  };
  const removeNode = (nid: string) => {
    // remove node + descendants
    const toRemove = new Set<string>([nid]);
    let changed = true;
    while (changed) {
      changed = false;
      flowNodes.forEach(n => { if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) { toRemove.add(n.id); changed = true; } });
    }
    updatePlaybook(id, { flowNodes: flowNodes.filter(n => !toRemove.has(n.id)) });
  };

  const rootNodes = flowNodes.filter(n => !n.parentId);
  const childrenOf = (pid: string) => flowNodes.filter(n => n.parentId === pid);

  const FlowNodeView: React.FC<{ node: PlaybookFlowNode; depth: number }> = ({ node, depth }) => {
    const children = childrenOf(node.id);
    return (
      <div className="flex flex-col items-stretch" style={{ marginLeft: depth === 0 ? 0 : 24 }}>
        <div className="bg-card border border-border rounded-lg p-3 max-w-md relative">
          <button onClick={() => removeNode(node.id)} className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Situação</label>
          <textarea value={node.situation} onChange={e => updateNode(node.id, { situation: e.target.value })} rows={2}
            className="w-full text-sm bg-transparent resize-none focus:outline-none text-foreground" />
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 block">Resposta sugerida</label>
          <textarea value={node.response} onChange={e => updateNode(node.id, { response: e.target.value })} rows={2}
            className="w-full text-sm bg-transparent resize-none focus:outline-none text-foreground" />
          <button onClick={() => addNode(node.id)} className="text-[11px] text-primary hover:underline mt-1">+ Ramificação</button>
        </div>
        {children.length > 0 && (
          <div className="border-l border-dashed border-border pl-3 mt-2 space-y-2">
            {children.map(c => <FlowNodeView key={c.id} node={c} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <input value={playbook.title} onChange={e => updatePlaybook(id, { title: e.target.value })}
            className="text-lg font-semibold bg-transparent text-foreground focus:outline-none min-w-0 flex-1" />
        </div>
        <div className="flex gap-1 bg-muted rounded-md p-0.5">
          <button onClick={() => setMode("document")}
            className={`text-xs font-medium px-3 py-1.5 rounded ${mode === "document" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <FileText className="w-3.5 h-3.5 inline mr-1" /> Documento
          </button>
          <button onClick={() => setMode("flow")}
            className={`text-xs font-medium px-3 py-1.5 rounded ${mode === "flow" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <GitBranch className="w-3.5 h-3.5 inline mr-1" /> Fluxo
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {mode === "document" ? (
          <div className="space-y-6">
            {sections.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma seção. Adicione a primeira abaixo.</p>}
            {sections.map(s => (
              <div key={s.id} className="group">
                <div className="flex items-center gap-2">
                  <input value={s.title} onChange={e => updateSection(s.id, { title: e.target.value })}
                    className="text-base font-semibold bg-transparent text-foreground focus:outline-none flex-1" />
                  <button onClick={() => removeSection(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea value={s.content} onChange={e => updateSection(s.id, { content: e.target.value })} rows={4}
                  placeholder="Escreva o conteúdo desta seção..."
                  className="w-full mt-2 text-sm text-foreground bg-transparent border-0 focus:outline-none resize-y placeholder:text-muted-foreground" />
                <hr className="border-border mt-2" />
              </div>
            ))}
            <button onClick={addSection} className="text-sm font-medium text-primary hover:underline">+ Adicionar seção</button>
          </div>
        ) : (
          <div className="space-y-4">
            {rootNodes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum nó. Adicione um nó raiz abaixo.</p>}
            {rootNodes.map(n => <FlowNodeView key={n.id} node={n} depth={0} />)}
            <button onClick={() => addNode(null)} className="text-sm font-medium text-primary hover:underline">+ Adicionar nó raiz</button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Scripts list ---------- */
const ScriptsList: React.FC = () => {
  const { scripts, usages, createScript, updateScript, deleteScript, toggleScriptActive } = usePlaybooks();
  const { leads } = useLeads();
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => scripts.map(s => {
    const su = usages.filter(u => u.scriptId === s.id);
    const advanced = su.filter(u => {
      const lead = leads.find(l => l.id === u.leadId);
      if (!lead || !u.leadStageAtUse) return false;
      return STAGE_ALL.indexOf(lead.stage) > STAGE_ALL.indexOf(u.leadStageAtUse as LeadStage);
    }).length;
    const conv = su.length > 0 ? Math.round((advanced / su.length) * 100) : 0;
    return { ...s, uses: su.length, conversion: conv };
  }), [scripts, usages, leads]);

  // Um grupo por momento, na ordem do atendimento; dentro dele, a ordem do painel
  // (ativos primeiro — inativos não aparecem no painel e ficam no fim).
  const groups = useMemo(() => ALL_MOMENTS
    .map(m => ({
      moment: m,
      items: rows.filter(r => r.moment === m)
        .sort((a, b) => Number(b.isActive) - Number(a.isActive) || byPosition(a, b)),
    }))
    .filter(g => g.items.length > 0), [rows]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" /> Novo Script
        </button>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 w-16">Ordem</th>
              <th className="text-left px-4 py-2.5">Passo</th>
              <th className="text-left px-4 py-2.5">Procedimento</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Usos</th>
              <th className="text-left px-4 py-2.5">Conversão</th>
              <th className="text-right px-4 py-2.5">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">Nenhum script criado.</td></tr>
            )}
            {groups.map(g => (
              <React.Fragment key={g.moment}>
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={7} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                    {MOMENT_LABELS[g.moment]}
                    <span className="ml-2 font-normal normal-case text-muted-foreground">
                      {g.items.filter(i => i.isActive).length} ativos
                    </span>
                  </td>
                </tr>
            {g.items.map(s => (
              <tr key={s.id} className={`border-t border-border hover:bg-accent/40 ${s.isActive ? "" : "opacity-50"}`}>
                <td className="px-4 py-3 text-muted-foreground text-xs">{s.position}</td>
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{s.trilha ?? "Todos"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleScriptActive(s.id, !s.isActive)}
                    className={`text-[11px] font-medium px-2 py-1 rounded-full ${s.isActive ? "bg-crm-success-light text-crm-success" : "bg-muted text-muted-foreground"}`}>
                    {s.isActive ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="px-4 py-3 text-foreground">{s.uses}</td>
                <td className="px-4 py-3 text-foreground">{s.conversion}%</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditId(s.id)} className="text-muted-foreground hover:text-foreground mr-2"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (confirm("Excluir este script?")) deleteScript(s.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ScriptEditModal
        open={!!editId || creating}
        onClose={() => { setEditId(null); setCreating(false); }}
        script={editId ? scripts.find(s => s.id === editId) ?? null : null}
        onSave={async (data) => {
          if (editId) await updateScript(editId, data);
          else await createScript(data);
        }}
        onToggle={async (active) => { if (editId) await toggleScriptActive(editId, active); }}
      />
    </div>
  );
};

const ScriptEditModal: React.FC<{
  open: boolean; onClose: () => void;
  script: Script | null;
  onSave: (data: ScriptInput) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
}> = ({ open, onClose, script, onSave, onToggle }) => {
  const [name, setName] = useState("");
  const [moment, setMoment] = useState<ScriptMoment>("primeira_resposta");
  const [triggersText, setTriggersText] = useState("");
  const [trilha, setTrilha] = useState("");
  const [positionText, setPositionText] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  React.useEffect(() => {
    if (open) {
      setName(script?.name ?? "");
      setMoment(script?.moment ?? "primeira_resposta");
      setTriggersText((script?.triggers ?? []).join("\n"));
      setTrilha(script?.trilha ?? "");
      setPositionText(script ? String(script.position) : "");
      setContent(script?.content ?? "");
      setIsActive(script?.isActive ?? true);
    }
  }, [open, script]);

  const isObjection = moment === "objecao";
  const homeStage = homeStageOf(moment);

  const handleSave = async () => {
    if (!name.trim()) return;
    const triggers = isObjection ? triggersText.split(/[\n,]/).map(t => t.trim()).filter(Boolean) : [];
    const parsed = Number.parseInt(positionText, 10);
    await onSave({
      name: name.trim(), moment, triggers, content, isActive,
      trilha: isObjection ? null : trilha.trim() || null,
      // Vazio no passo novo = entra no fim do momento.
      ...(Number.isFinite(parsed) ? { position: parsed } : {}),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{script ? "Editar script" : "Novo script"}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Momento do atendimento</label>
            <select value={moment} onChange={e => setMoment(e.target.value as ScriptMoment)}
              className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
              {ALL_MOMENTS.map(m => <option key={m} value={m}>{MOMENT_LABELS[m]}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isObjection
                ? "Vale em qualquer etapa e não muda a etapa do lead. Aparece em destaque quando a paciente usa uma das frases abaixo."
                : `Etapa do funil: ${homeStage ? STAGE_LABELS[homeStage] : "—"}.`}
              {moment === "no_show" && " Aparece quando o agendamento do lead está como “Não compareceu”."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {!isObjection && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Procedimento (opcional)</label>
                <input value={trilha} onChange={e => setTrilha(e.target.value)} placeholder="Todos"
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            )}
            <div className={isObjection ? "col-span-3" : ""}>
              <label className="text-xs font-medium text-muted-foreground">Ordem</label>
              <input value={positionText} onChange={e => setPositionText(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric" placeholder="fim"
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            {isObjection
              ? "Ordem na lista de objeções."
              : "Procedimento: deixe vazio se o passo vale para qualquer paciente. Preenchido (ex.: Botox), só aparece para quem tem esse procedimento. Ordem: menor aparece primeiro no painel."}
          </p>
          {isObjection && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Frases da paciente que disparam (uma por linha)</label>
              <textarea value={triggersText} onChange={e => setTriggersText(e.target.value)} rows={3}
                placeholder={"vou pensar\ndepois eu vejo"}
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Conteúdo</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
              placeholder={"# Título da seção (não é enviado)\n\nPrimeira mensagem\n\nSegunda mensagem"}
              className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Linha em branco separa mensagens. Linha começando com <code>#</code> é título de seção — organiza o painel e nunca é enviada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="active" className="text-sm text-foreground">Ativo (aparece no painel da conversa)</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
            <button onClick={handleSave} disabled={!name.trim()} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">Salvar</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- Results ---------- */
const ResultsList: React.FC = () => {
  const { scripts, usages } = usePlaybooks();
  const { leads } = useLeads();

  const rows = useMemo(() => {
    const sorted = [...scripts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sorted.map(s => {
      const su = usages.filter(u => u.scriptId === s.id);
      const advanced = su.filter(u => {
        const lead = leads.find(l => l.id === u.leadId);
        if (!lead || !u.leadStageAtUse) return false;
        return STAGE_ALL.indexOf(lead.stage) > STAGE_ALL.indexOf(u.leadStageAtUse as LeadStage);
      }).length;
      const conv = su.length > 0 ? Math.round((advanced / su.length) * 100) : 0;
      return { ...s, uses: su.length, conversion: conv };
    });
  }, [scripts, usages, leads]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2.5">Script</th>
            <th className="text-left px-4 py-2.5">Momento</th>
            <th className="text-left px-4 py-2.5">Status</th>
            <th className="text-left px-4 py-2.5">Usos</th>
            <th className="text-left px-4 py-2.5">Conversão</th>
            <th className="text-left px-4 py-2.5">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">Nenhum dado ainda.</td></tr>
          )}
          {rows.map(s => (
            <tr key={s.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
              <td className="px-4 py-3 text-foreground">{MOMENT_LABELS[s.moment]}</td>
              <td className="px-4 py-3">
                <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${s.isActive ? "bg-crm-success-light text-crm-success" : "bg-muted text-muted-foreground"}`}>
                  {s.isActive ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="px-4 py-3 text-foreground">{s.uses}</td>
              <td className="px-4 py-3 text-foreground">{s.conversion}%</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Playbooks;
