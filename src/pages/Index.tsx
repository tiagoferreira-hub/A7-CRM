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
import Indicacoes from "@/pages/Indicacoes";
import Workflows from "@/pages/Workflows";
import Reports from "@/pages/Reports";
import Playbooks from "@/pages/Playbooks";


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
    const navHandler = (e: Event) => {
      const ce = e as CustomEvent<{ tab: AppTab }>;
      if (ce.detail?.tab) setTab(ce.detail.tab);
    };
    window.addEventListener("crm:openConversationByLead", handler);
    window.addEventListener("crm:navigate", navHandler);
    return () => {
      window.removeEventListener("crm:openConversationByLead", handler);
      window.removeEventListener("crm:navigate", navHandler);
    };
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
        {tab === "indicacoes" && <Indicacoes />}
        {tab === "workflows" && <Workflows />}
        {tab === "playbooks" && <Playbooks />}
        {tab === "reports" && <Reports />}

        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
};

export default Index;
