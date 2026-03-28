import React, { useState } from "react";
import { LeadsProvider } from "@/context/LeadsContext";
import KanbanBoard from "@/components/crm/KanbanBoard";
import Dashboard from "@/components/crm/Dashboard";
import { LayoutGrid, BarChart3 } from "lucide-react";

type Tab = "pipeline" | "dashboard";

const CRMApp: React.FC = () => {
  const [tab, setTab] = useState<Tab>("pipeline");

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground tracking-tight">CRM A7</h1>
          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
            Saúde & Estética
          </span>
        </div>
        <nav className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setTab("pipeline")}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              tab === "pipeline"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Pipeline
          </button>
          <button
            onClick={() => setTab("dashboard")}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              tab === "dashboard"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === "pipeline" ? <KanbanBoard /> : <Dashboard />}
      </main>
    </div>
  );
};

const Index = () => (
  <LeadsProvider>
    <CRMApp />
  </LeadsProvider>
);

export default Index;
