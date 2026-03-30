import React, { useState } from "react";
import { useDocuments, Document, DocType, DocStatus } from "@/context/DocumentsContext";
import { Plus, Pencil, Trash2, FileText, BookOpen, X } from "lucide-react";

const TYPE_LABELS: Record<DocType, string> = { playbook: "Playbook Comercial", script: "Script" };
const STATUS_LABELS: Record<DocStatus, string> = { draft: "Rascunho", active: "Ativo", inactive: "Inativo" };
const STATUS_COLORS: Record<DocStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-600",
};

const Documents: React.FC = () => {
  const { documents, addDocument, updateDocument, deleteDocument } = useDocuments();
  const [editing, setEditing] = useState<Document | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("playbook");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<DocStatus>("draft");

  const openNew = () => {
    setTitle(""); setDocType("playbook"); setContent(""); setStatus("draft");
    setEditing(null); setShowForm(true);
  };

  const openEdit = (doc: Document) => {
    setTitle(doc.title); setDocType(doc.docType); setContent(doc.content); setStatus(doc.status);
    setEditing(doc); setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (editing) {
      await updateDocument(editing.id, { title: title.trim(), docType, content, status });
    } else {
      await addDocument({ title: title.trim(), docType, content, status, closedAt: null });
    }
    setShowForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Documentos Comerciais</h2>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Novo Documento
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{editing ? "Editar documento" : "Novo documento"}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <input className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Título..." value={title} onChange={e => setTitle(e.target.value)} />
          <div className="flex gap-3">
            <select className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={docType} onChange={e => setDocType(e.target.value as DocType)}>
              <option value="playbook">Playbook Comercial</option>
              <option value="script">Script</option>
            </select>
            <select className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={status} onChange={e => setStatus(e.target.value as DocStatus)}>
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <textarea className="w-full min-h-[200px] text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-y" placeholder="Conteúdo do documento..." value={content} onChange={e => setContent(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Salvar</button>
            <button onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {documents.map(doc => (
          <div key={doc.id} className="bg-card rounded-xl border border-border p-4 flex items-start justify-between hover:bg-accent/30 transition-colors group">
            <div className="flex items-start gap-3 flex-1">
              {doc.docType === "playbook" ? <BookOpen className="w-5 h-5 text-primary mt-0.5" /> : <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />}
              <div>
                <p className="text-sm font-medium text-foreground">{doc.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[doc.docType]}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[doc.status]}`}>{STATUS_LABELS[doc.status]}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
                {doc.content && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.content}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(doc)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => deleteDocument(doc.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {documents.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum documento cadastrado</p>
        )}
      </div>
    </div>
  );
};

export default Documents;
