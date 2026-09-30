import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import HomeDashboard from "@/components/crm/HomeDashboard";
import KanbanBoard from "@/components/crm/KanbanBoard";

/**
 * Tela de entrada: o Dashboard. O quadro Kanban saiu da entrada, mas segue a
 * um clique ("Quadro") — é a única visão de arrastar leads entre etapas.
 */
const Lifecycle: React.FC = () => {
  const [view, setView] = useState<"dashboard" | "board">("dashboard");

  if (view === "dashboard") return <HomeDashboard onShowBoard={() => setView("board")} />;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-2 border-b border-border bg-card">
        <button
          onClick={() => setView("dashboard")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </div>
  );
};

export default Lifecycle;
