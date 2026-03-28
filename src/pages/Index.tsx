import React, { useState } from "react";
import { LeadsProvider } from "@/context/LeadsContext";
import { ServicesProvider } from "@/context/ServicesContext";
import KanbanBoard from "@/components/crm/KanbanBoard";
import Dashboard from "@/components/crm/Dashboard";
import Settings from "@/pages/Settings";
import { LayoutGrid, BarChart3, Settings as SettingsIcon } from "lucide-react";

type Tab = "pipeline" | "dashboard" | "settings";

const CRMApp: React.FC = () => {
  const [tab, setTab] = useState<Tab>("pipeline");

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground tracking-tight">CRM A7</h1>
          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
            Saúde & Estética
          </span>
        </div>
        <nav className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {([
            { key: "pipeline" as Tab, icon: LayoutGrid, label: "Pipeline" },
            { key: "dashboard" as Tab, icon: BarChart3, label: "Dashboard" },
            { key: "settings" as Tab, icon: SettingsIcon, label: "Configurações" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === "pipeline" && <KanbanBoard />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
};

const Index = () => (
  <ServicesProvider>
    <LeadsProvider>
      <CRMApp />
    </LeadsProvider>
  </ServicesProvider>
);

export default Index;
