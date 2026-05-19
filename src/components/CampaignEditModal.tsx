import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCampaigns } from "@/context/CampaignsContext";
import { Campaign, CampaignChannel, CAMPAIGN_CHANNEL_LABELS } from "@/types/automations";
import { Pause, Play, Trash2 } from "lucide-react";

interface Props {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
}

const CampaignEditModal: React.FC<Props> = ({ campaign, open, onClose }) => {
  const { updateCampaign, setCampaignStatus, deleteCampaign } = useCampaigns();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("whatsapp");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState("");

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setChannel(campaign.channel);
      setDate(campaign.scheduledAt ? campaign.scheduledAt.slice(0, 16) : "");
      setMessage(campaign.payload?.message ?? "");
      setRecipients(campaign.payload?.recipients ?? "");
    }
  }, [campaign]);

  if (!campaign) return null;

  const save = async () => {
    await updateCampaign(campaign.id, {
      name: name.trim() || campaign.name,
      channel,
      scheduledAt: date ? new Date(date).toISOString() : null,
      payload: { ...campaign.payload, message, recipients },
    });
    onClose();
  };
  const toggle = async () => {
    const next = campaign.status === "ativo" ? "pausado" : "ativo";
    await setCampaignStatus(campaign.id, next);
    onClose();
  };
  const remove = async () => {
    if (!confirm("Excluir este disparo?")) return;
    await deleteCampaign(campaign.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-xl shadow-lg">
        <DialogHeader><DialogTitle>Editar disparo</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Canal</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as CampaignChannel)}
                className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background">
                {Object.entries(CAMPAIGN_CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Agendar para</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensagem</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Destinatários</label>
            <input value={recipients} onChange={(e) => setRecipients(e.target.value)}
              placeholder="Ex.: todos, leads_frios, tag:vip"
              className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background" />
          </div>
        </div>
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border mt-2">
          <button onClick={remove} className="inline-flex items-center gap-1.5 text-sm h-10 px-3 rounded-lg text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
          <div className="flex gap-2">
            <button onClick={toggle} className="inline-flex items-center gap-1.5 text-sm h-10 px-3 rounded-lg border border-input hover:bg-accent">
              {campaign.status === "ativo" ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Ativar</>}
            </button>
            <button onClick={onClose} className="text-sm h-10 px-3 rounded-lg border border-input hover:bg-accent">Cancelar</button>
            <button onClick={save} className="text-sm h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Salvar</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignEditModal;
