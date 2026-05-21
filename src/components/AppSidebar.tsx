import React from "react";
import {
  Workflow, MessageSquare, Users, Calendar, CheckSquare, Send,
  GitBranch, BarChart3, Settings as SettingsIcon, LogOut, ArrowLeft, Home,
  Sun, Moon, BookOpen,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import Logo from "@/components/Logo";

export type AppTab =
  | "home" | "lifecycle" | "conversations" | "contacts" | "agenda"
  | "tasks" | "disparos" | "workflows" | "playbooks" | "reports" | "settings";


interface Props {
  tab: AppTab;
  setTab: (t: AppTab) => void;
}

const AppSidebar: React.FC<Props> = ({ tab, setTab }) => {
  const { signOut, displayName, user, role, viewAsCompany, setViewAsCompany } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isSeller = role === "seller";

  const items: { key: AppTab; icon: any; label: string; roles?: string[] }[] = [
    ...(isSeller ? [{ key: "home" as AppTab, icon: Home, label: "Início" }] : []),
    { key: "lifecycle", icon: Workflow, label: "Lifecycle" },
    { key: "conversations", icon: MessageSquare, label: "Conversas" },
    { key: "contacts", icon: Users, label: "Contatos" },
    { key: "agenda", icon: Calendar, label: "Agenda" },
    { key: "tasks", icon: CheckSquare, label: "Tarefas" },
    { key: "disparos", icon: Send, label: "Disparos" },
    { key: "workflows", icon: GitBranch, label: "Fluxos de Trabalho" },
    { key: "reports", icon: BarChart3, label: "Relatórios", roles: ["owner", "client", "admin"] },
    { key: "settings", icon: SettingsIcon, label: "Configurações", roles: ["owner", "client", "admin"] },
  ];

  const visible = items.filter(i => !i.roles || i.roles.includes(role || ""));

  return (
    <aside
      className="group/sidebar shrink-0 flex flex-col bg-card border-r border-border w-[60px] hover:w-[220px] transition-[width] duration-200 ease-out overflow-hidden"
    >
      <div className="flex items-center justify-center group-hover/sidebar:justify-start gap-2 px-2 group-hover/sidebar:px-4 py-4 border-b border-border transition-all">
        <Logo size={36} />
      </div>

      {role === "owner" && viewAsCompany && (
        <button
          onClick={() => setViewAsCompany(null)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors py-2 justify-center group-hover/sidebar:justify-start group-hover/sidebar:px-4"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">Voltar</span>
        </button>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {visible.map(({ key, icon: Icon, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              title={label}
              className={`w-full flex items-center gap-3 text-sm font-medium rounded-md transition-colors h-9 px-2.5 ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 flex items-center gap-1.5 justify-center group-hover/sidebar:justify-start group-hover/sidebar:px-3">
        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {(displayName || user?.email || "?").substring(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity overflow-hidden">
          <p className="text-xs font-medium text-foreground truncate">{displayName || user?.email}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover/sidebar:opacity-100"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={signOut}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover/sidebar:opacity-100"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
