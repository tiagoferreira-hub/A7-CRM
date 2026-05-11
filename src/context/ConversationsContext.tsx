import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Conversation {
  id: string;
  leadId: string;
  channel: string;
  externalId: string | null;
  assignedTo: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  body: string;
  sentAt: string;
}

interface ConversationsContextType {
  conversations: Conversation[];
  loading: boolean;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  sendMessage: (conversationId: string, body: string, direction?: "inbound" | "outbound") => Promise<Message | null>;
  markRead: (conversationId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextType | null>(null);

export const useConversations = () => {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
};

const rowToConv = (r: any): Conversation => ({
  id: r.id,
  leadId: r.lead_id,
  channel: r.channel,
  externalId: r.external_id,
  assignedTo: r.assigned_to,
  lastMessage: r.last_message,
  lastMessageAt: r.last_message_at,
  unreadCount: r.unread_count,
  createdAt: r.created_at,
});

const rowToMsg = (r: any): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  direction: r.direction,
  body: r.body,
  sentAt: r.sent_at,
});

export const ConversationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId, role, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!activeCompanyId) { setConversations([]); return; }
    setLoading(true);
    let q = (supabase as any)
      .from("conversations")
      .select("*")
      .eq("company_id", activeCompanyId)
      .order("last_message_at", { ascending: false });
    if (role === "seller" && user) q = q.eq("assigned_to", user.id);
    const { data } = await q;
    setConversations((data ?? []).map(rowToConv));
    setLoading(false);
  }, [activeCompanyId, role, user]);

  useEffect(() => { reload(); }, [reload]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });
    return (data ?? []).map(rowToMsg);
  }, []);

  const sendMessage = useCallback(async (conversationId: string, body: string, direction: "inbound" | "outbound" = "outbound") => {
    if (!activeCompanyId || !body.trim()) return null;
    const { data } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conversationId,
        company_id: activeCompanyId,
        body: body.trim(),
        direction,
      })
      .select()
      .single();
    if (data) {
      setConversations(prev =>
        prev
          .map(c => c.id === conversationId ? { ...c, lastMessage: body.trim(), lastMessageAt: data.sent_at } : c)
          .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      );
      return rowToMsg(data);
    }
    return null;
  }, [activeCompanyId]);

  const markRead = useCallback(async (conversationId: string) => {
    if (!activeCompanyId) return;
    await (supabase as any)
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId)
      .eq("company_id", activeCompanyId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
  }, [activeCompanyId]);

  return (
    <ConversationsContext.Provider value={{ conversations, loading, loadMessages, sendMessage, markRead, reload }}>
      {children}
    </ConversationsContext.Provider>
  );
};
