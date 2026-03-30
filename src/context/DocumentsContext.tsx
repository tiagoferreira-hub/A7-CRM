import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type DocType = "playbook" | "script";
export type DocStatus = "draft" | "active" | "inactive";

export interface Document {
  id: string;
  title: string;
  docType: DocType;
  content: string;
  status: DocStatus;
  closedAt: string | null;
  createdAt: string;
}

interface DocumentsContextType {
  documents: Document[];
  addDocument: (doc: Omit<Document, "id" | "createdAt">) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  loading: boolean;
}

const DocumentsContext = createContext<DocumentsContextType | null>(null);

export const useDocuments = () => {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentsProvider");
  return ctx;
};

const rowToDoc = (row: any): Document => ({
  id: row.id,
  title: row.title,
  docType: row.doc_type,
  content: row.content,
  status: row.status,
  closedAt: row.closed_at,
  createdAt: row.created_at,
});

export const DocumentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!activeCompanyId) { setDocuments([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false });
    setDocuments(data?.map(rowToDoc) ?? []);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const addDocument = useCallback(async (doc: Omit<Document, "id" | "createdAt">) => {
    if (!activeCompanyId) return;
    const { data } = await supabase
      .from("documents")
      .insert({
        company_id: activeCompanyId,
        title: doc.title,
        doc_type: doc.docType,
        content: doc.content,
        status: doc.status,
        closed_at: doc.closedAt,
      })
      .select()
      .single();
    if (data) setDocuments(prev => [rowToDoc(data), ...prev]);
  }, [activeCompanyId]);

  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.docType !== undefined) dbUpdates.doc_type = updates.docType;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.closedAt !== undefined) dbUpdates.closed_at = updates.closedAt;
    await supabase.from("documents").update(dbUpdates).eq("id", id);
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    await supabase.from("documents").delete().eq("id", id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  return (
    <DocumentsContext.Provider value={{ documents, addDocument, updateDocument, deleteDocument, loading }}>
      {children}
    </DocumentsContext.Provider>
  );
};
