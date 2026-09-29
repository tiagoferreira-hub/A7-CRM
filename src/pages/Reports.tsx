import React, { useState } from "react";
import Dashboard from "@/components/crm/Dashboard";
import ConversationsReport from "@/components/crm/ConversationsReport";
import ConversionReport from "@/components/crm/ConversionReport";
import MetasReport from "@/components/crm/MetasReport";
import { BarChart3, MessageSquare, Users, TrendingUp, Workflow, type LucideIcon } from "lucide-react";

// Só abas que existem. "Respostas" e "Atendimento" eram placeholders "Em breve" e
// saíram até terem conteúdo.
type Category = "lifecycle" | "conversations" | "users" | "conversion";

const CATEGORIES: { key: Category; label: string; icon: LucideIcon }[] = [
  { key: "lifecycle", label: "Lifecycle", icon: Workflow },
  { key: "conversations", label: "Conversas", icon: MessageSquare },
  { key: "users", label: "Usuários", icon: Users },
  { key: "conversion", label: "Conversão", icon: TrendingUp },
];

const Reports: React.FC = () => {
  const [cat, setCat] = useState<Category>("lifecycle");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Relatórios</h2>
        </div>
      </div>

      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-card overflow-x-auto">
        {CATEGORIES.map(c => {
          const Icon = c.icon;
          const active = cat === c.key;
          return (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}>
              <Icon className="w-4 h-4" /> {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cat === "lifecycle" && <Dashboard />}
        {cat === "conversations" && <ConversationsReport />}
        {cat === "conversion" && <ConversionReport />}
        {cat === "users" && <MetasReport />}
      </div>
    </div>
  );
};

export default Reports;
