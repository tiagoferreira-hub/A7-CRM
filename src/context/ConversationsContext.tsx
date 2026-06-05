import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLeads } from "@/context/LeadsContext";
import { useKeywordRules } from "@/context/KeywordRulesContext";
import { evaluateKeywords } from "@/lib/keywordMatcher";

export interface Conversation {
  id: string;
  leadId: string;
  channel: string;
  externalId: string | null;
  assignedTo: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  awaitingReply: boolean;
  isUnread: boolean;
  status: "open" | "closed";
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
  setAwaitingReply: (conversationId: string, value: boolean) => Promise<void>;
  markUnread: (conversationId: string, value: boolean) => Promise<void>;
  assignConversation: (conversationId: string, leadId: string, userId: string | null) => Promise<void>;
  setConversationStatus: (conversationId: string, status: "open" | "closed") => Promise<void>;
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
  awaitingReply: r.awaiting_reply ?? false,
  isUnread: r.is_unread ?? false,
  status: (r.status as "open" | "closed") ?? "open",
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
  const { leads, moveLead } = useLeads();
  const { rules } = useKeywordRules();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  // Aplica as regras de palavra-chave da company à mensagem; no 1º match move a etapa
  // do lead (trigger 'keyword') respeitando a regra de retrocesso. Append-only/silencioso.
  const applyKeywordRules = useCallback((conversationId: string, body: string) => {
    if (!rules.length || !body.trim()) return;
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    const lead = leads.find((l) => l.id === conv.leadId);
    if (!lead) return;
    const hit = evaluateKeywords(body, rules, lead.stage);
    if (hit) moveLead(lead.id, hit.target, null, { trigger: "keyword", triggerRef: hit.rule.id });
  }, [rules, conversations, leads, moveLead]);

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
      // outbound message clears "awaiting reply"
      if (direction === "outbound") {
        await (supabase as any).from("conversations")
          .update({ awaiting_reply: true })
          .eq("id", conversationId).eq("company_id", activeCompanyId);
      }
      setConversations(prev =>
        prev
          .map(c => c.id === conversationId ? {
            ...c,
            lastMessage: body.trim(),
            lastMessageAt: data.sent_at,
            awaitingReply: direction === "outbound" ? true : c.awaitingReply,
          } : c)
          .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      );
      // Regras de palavra-chave → lifecycle (recebida ou enviada).
      applyKeywordRules(conversationId, body);
      return rowToMsg(data);
    }
    return null;
  }, [activeCompanyId, applyKeywordRules]);

  const markRead = useCallback(async (conversationId: string) => {
    if (!activeCompanyId) return;
    await (supabase as any)
      .from("conversations")
      .update({ unread_count: 0, is_unread: false })
      .eq("id", conversationId)
      .eq("company_id", activeCompanyId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0, isUnread: false } : c));
  }, [activeCompanyId]);

  const setAwaitingReply = useCallback(async (conversationId: string, value: boolean) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("conversations")
      .update({ awaiting_reply: value })
      .eq("id", conversationId).eq("company_id", activeCompanyId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, awaitingReply: value } : c));
  }, [activeCompanyId]);

  const markUnread = useCallback(async (conversationId: string, value: boolean) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("conversations")
      .update({ is_unread: value })
      .eq("id", conversationId).eq("company_id", activeCompanyId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, isUnread: value } : c));
  }, [activeCompanyId]);

  const assignConversation = useCallback(async (conversationId: string, leadId: string, userId: string | null) => {
    if (!activeCompanyId) return;
    await (supabase as any).from("conversations")
      .update({ assigned_to: userId })
      .eq("id", conversationId).eq("company_id", activeCompanyId);
    await (supabase as any).from("leads")
      .update({ assigned_to: userId })
      .eq("id", leadId).eq("company_id", activeCompanyId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, assignedTo: userId } : c));
  }, [activeCompanyId]);

  const setConversationStatus = useCallback(async (conversationId: string, status: "open" | "closed") => {
    if (!activeCompanyId) return;
    await (supabase as any).from("conversations")
      .update({ status })
      .eq("id", conversationId).eq("company_id", activeCompanyId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, status } : c));
  }, [activeCompanyId]);

  return (
    <ConversationsContext.Provider value={{ conversations, loading, loadMessages, sendMessage, markRead, setAwaitingReply, markUnread, assignConversation, setConversationStatus, reload }}>
      {children}
    </ConversationsContext.Provider>
  );
};
