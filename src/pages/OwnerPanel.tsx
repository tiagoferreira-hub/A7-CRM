import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, DollarSign, Eye, Plus, Copy, LogOut } from "lucide-react";

interface ClientInfo {
  company_id: string;
  company_name: string;
  status: string;
  total_leads: number;
  total_sales: number;
  total_value: number;
  last_activity: string | null;
}

const OwnerPanel: React.FC = () => {
  const { user, signOut, setViewAsCompany, displayName } = useAuth();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    // Get all companies
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, status, created_at");

    if (!companies) { setLoading(false); return; }

    const clientInfos: ClientInfo[] = [];

    for (const company of companies) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, stage, value, updated_at")
        .eq("company_id", company.id);

      const allLeads = leads ?? [];
      const sales = allLeads.filter(l => l.stage === "fechou");
      const lastActivity = allLeads.length > 0
        ? allLeads.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at
        : null;

      clientInfos.push({
        company_id: company.id,
        company_name: company.name,
        status: company.status,
        total_leads: allLeads.length,
        total_sales: sales.length,
        total_value: sales.reduce((sum, l) => sum + Number(l.value), 0),
        last_activity: lastActivity,
      });
    }

    setClients(clientInfos);
    setLoading(false);
  };

  const generateInvite = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("invitations")
      .insert({ created_by: user.id })
      .select("token")
      .single();

    if (data) {
      const link = `${window.location.origin}/login?invite=${data.token}`;
      setInviteLink(link);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground tracking-tight">CRM A7</h1>
          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
            Painel do Proprietário
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{displayName || user?.email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {/* Invite Section */}
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Convidar novo cliente</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={generateInvite}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Gerar link de convite
            </button>
            {inviteLink && (
              <div className="flex items-center gap-2 flex-1">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 text-xs border border-input rounded-md px-3 py-2 bg-background text-muted-foreground"
                />
                <button
                  onClick={copyInvite}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Total de clientes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{clients.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Total de leads</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {clients.reduce((s, c) => s + c.total_leads, 0)}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Valor total vendido</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(clients.reduce((s, c) => s + c.total_value, 0))}
            </p>
          </div>
        </div>

        {/* Client List */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Clientes</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum cliente cadastrado. Gere um link de convite para começar.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {clients.map((client) => (
                <div key={client.company_id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.total_leads} leads · {client.total_sales} vendas · {formatCurrency(client.total_value)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      client.status === "active"
                        ? "bg-crm-success-light text-crm-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {client.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(client.last_activity)}
                    </span>
                    <button
                      onClick={() => setViewAsCompany(client.company_id)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Eye className="w-3.5 h-3.5" /> Acessar CRM
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OwnerPanel;
