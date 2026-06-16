import React, { useState } from "react";
import Dashboard from "@/components/crm/Dashboard";
import ConversationsReport from "@/components/crm/ConversationsReport";
import ConversionReport from "@/components/crm/ConversionReport";
import MetasReport from "@/components/crm/MetasReport";
import { BarChart3, MessageSquare, MessageCircleReply, Users, TrendingUp, Headphones, Workflow } from "lucide-react";

type Category = "lifecycle" | "conversations" | "responses" | "users" | "conversion" | "attendance";

const CATEGORIES: { key: Category; label: string; icon: any; description: string }[] = [
  { key: "lifecycle", label: "Lifecycle", icon: Workflow, description: "Funil, etapas e movimentação de leads no ciclo de vida." },
  { key: "conversations", label: "Conversas", icon: MessageSquare, description: "Volume de mensagens, canais e tempo de resposta." },
  { key: "responses", label: "Respostas", icon: MessageCircleReply, description: "Taxa de resposta e tempo médio de retorno." },
  { key: "users", label: "Usuários", icon: Users, description: "Performance por vendedor e atribuição de leads." },
  { key: "conversion", label: "Conversão", icon: TrendingUp, description: "Taxas de conversão por etapa, origem e canal." },
  { key: "attendance", label: "Atendimento", icon: Headphones, description: "Filas, SLA e tempo médio de atendimento." },
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
        {cat !== "lifecycle" && cat !== "conversations" && cat !== "conversion" && cat !== "users" && (
          <div className="p-6 max-w-3xl mx-auto">
            <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card">
              {(() => {
                const c = CATEGORIES.find(x => x.key === cat)!;
                const Icon = c.icon;
                return (
                  <>
                    <Icon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-base font-semibold text-foreground mb-1">Relatórios de {c.label}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{c.description}</p>
                    <p className="text-xs text-muted-foreground italic">Em breve disponível.</p>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
