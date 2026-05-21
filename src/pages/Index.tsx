import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import AppSidebar, { AppTab } from "@/components/AppSidebar";
import KanbanBoard from "@/components/crm/KanbanBoard";
import SellerDashboard from "@/components/crm/SellerDashboard";
import Settings from "@/pages/Settings";
import Tasks from "@/pages/Tasks";
import Conversations from "@/pages/Conversations";
import Agenda from "@/pages/Agenda";
import Contacts from "@/pages/Contacts";
import Disparos from "@/pages/Disparos";
import Workflows from "@/pages/Workflows";
import Reports from "@/pages/Reports";

const Index: React.FC = () => {
  const { role } = useAuth();
  const isSeller = role === "seller";
  const [tab, setTab] = useState<AppTab>(isSeller ? "home" : "lifecycle");
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ leadId: string }>;
      if (!ce.detail?.leadId) return;
      setPendingLeadId(ce.detail.leadId);
      setTab("conversations");
    };
    window.addEventListener("crm:openConversationByLead", handler);
    return () => window.removeEventListener("crm:openConversationByLead", handler);
  }, []);

  return (
    <div className="flex h-screen bg-background w-full">
      <AppSidebar tab={tab} setTab={setTab} />
      <main className="flex-1 overflow-hidden">
        {tab === "home" && isSeller && <SellerDashboard />}
        {tab === "lifecycle" && <KanbanBoard />}
        {tab === "conversations" && (
          <Conversations
            pendingLeadId={pendingLeadId}
            onPendingHandled={() => setPendingLeadId(null)}
          />
        )}
        {tab === "contacts" && <Contacts />}
        {tab === "agenda" && <Agenda />}
        {tab === "tasks" && <Tasks />}
        {tab === "disparos" && <Disparos />}
        {tab === "workflows" && <Workflows />}
        {tab === "reports" && <Reports />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
};

export default Index;
