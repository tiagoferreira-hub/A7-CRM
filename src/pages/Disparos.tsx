import React, { useState } from "react";
import { useCampaigns } from "@/context/CampaignsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CAMPAIGN_CHANNEL_LABELS, CAMPAIGN_STATUS_LABELS, CampaignChannel } from "@/types/automations";
import { Send, Plus, Trash2, Pause, Play, Mail, MessageCircle } from "lucide-react";

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});

const Disparos: React.FC = () => {
  const { campaigns, addCampaign, setCampaignStatus, deleteCampaign } = useCampaigns();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("whatsapp");
  const [date, setDate] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await addCampaign({
      name: name.trim(),
      channel,
      scheduledAt: date ? new Date(date).toISOString() : null,
    });
    setOpen(false); setName(""); setChannel("whatsapp"); setDate("");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Send className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Disparos</h2>
          <span className="text-xs text-muted-foreground">Campanhas e mensagens em massa</span>
        </div>
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" /> Novo disparo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 max-w-4xl mx-auto w-full">
        <p className="text-xs text-muted-foreground">
          Estrutura preparada para disparos via WhatsApp, e-mail e outros canais. Envio real será habilitado com a integração de canais.
        </p>
        {campaigns.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Send className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground italic">Nenhum disparo cadastrado ainda.</p>
          </div>
        )}
        {campaigns.map(c => (
          <div key={c.id} className="border border-border rounded-lg p-4 bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {c.channel === "whatsapp" ? <MessageCircle className="w-4 h-4 text-emerald-600" /> : <Mail className="w-4 h-4 text-blue-600" />}
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{CAMPAIGN_CHANNEL_LABELS[c.channel]}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">{CAMPAIGN_STATUS_LABELS[c.status]}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {c.scheduledAt ? fmt(c.scheduledAt) : "Sem agendamento"} · Enviadas: {c.sentCount} · Respostas: {c.repliedCount}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {c.status === "ativo" ? (
                <button onClick={() => setCampaignStatus(c.id, "pausado")} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </button>
              ) : (
                <button onClick={() => setCampaignStatus(c.id, "ativo")} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
                  <Play className="w-3.5 h-3.5" /> Ativar
                </button>
              )}
              <button onClick={() => deleteCampaign(c.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo disparo</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex.: Promoção de inverno"
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Canal</label>
                <select value={channel} onChange={e => setChannel(e.target.value as CampaignChannel)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background">
                  {Object.entries(CAMPAIGN_CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Agendar para</label>
                <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-accent">Cancelar</button>
              <button onClick={handleCreate} className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">Criar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Disparos;
