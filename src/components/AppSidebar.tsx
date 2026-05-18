import React from "react";
import {
  Workflow, MessageSquare, Users, Calendar, CheckSquare, Send,
  GitBranch, BarChart3, Settings as SettingsIcon, LogOut, ArrowLeft, Home, ChevronsLeft, ChevronsRight,
  Sun, Moon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import Logo from "@/components/Logo";

export type AppTab =
  | "home" | "lifecycle" | "conversations" | "contacts" | "agenda"
  | "tasks" | "disparos" | "workflows" | "reports" | "settings";

interface Props {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const AppSidebar: React.FC<Props> = ({ tab, setTab, collapsed, setCollapsed }) => {
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
  const width = collapsed ? "w-16" : "w-60";

  return (
    <aside className={`${width} shrink-0 flex flex-col bg-card border-r border-border transition-all`}>
      <div className={`flex items-center gap-2 px-4 py-4 border-b border-border ${collapsed ? "justify-center px-2" : ""}`}>
        <div className={collapsed ? "" : "flex-1 min-w-0 flex items-center"}>
          <Logo size={collapsed ? 32 : 40} />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      {role === "owner" && viewAsCompany && (
        <button
          onClick={() => setViewAsCompany(null)}
          className={`flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors py-2 ${collapsed ? "justify-center" : "px-4"}`}
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" /> {!collapsed && "Voltar"}
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map(({ key, icon: Icon, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 text-sm font-medium rounded-md transition-colors ${
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
              } ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-border p-3 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {(displayName || user?.email || "?").substring(0, 1).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{displayName || user?.email}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={signOut}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
