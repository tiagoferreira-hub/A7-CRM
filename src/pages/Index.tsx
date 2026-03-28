import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import KanbanBoard from "@/components/crm/KanbanBoard";
import Dashboard from "@/components/crm/Dashboard";
import Settings from "@/pages/Settings";
import { LayoutGrid, BarChart3, Settings as SettingsIcon, LogOut, ArrowLeft } from "lucide-react";

type Tab = "pipeline" | "dashboard" | "settings";

const Index: React.FC = () => {
  const { signOut, displayName, user, role, viewAsCompany, setViewAsCompany } = useAuth();
  const [tab, setTab] = useState<Tab>("pipeline");

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {role === "owner" && viewAsCompany && (
            <button
              onClick={() => setViewAsCompany(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mr-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <h1 className="text-lg font-bold text-foreground tracking-tight">CRM A7</h1>
          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
            Saúde & Estética
          </span>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-muted-foreground">{displayName || user?.email}</span>
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === "pipeline" && <KanbanBoard />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
};

export default Index;
