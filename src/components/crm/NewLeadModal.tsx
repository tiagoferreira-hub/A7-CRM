import React, { useState } from "react";
import { LeadOrigin, LeadStage, ORIGIN_LABELS, ORIGIN_OPTIONS, STAGE_LABELS, STAGE_ORDER } from "@/types/lead";
import { useLeads } from "@/context/LeadsContext";
import { useProcedures } from "@/context/ProceduresContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ServiceBadges from "@/components/crm/ServiceBadges";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NewLeadModal: React.FC<Props> = ({ open, onClose }) => {
  const { addLead, leads } = useLeads();
  const { procedures } = useProcedures();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    origin: "manual" as LeadOrigin,
    services: [] as string[],
    value: "",
    lastMessage: "",
    observations: "",
    stage: "lead_entrou" as LeadStage,
    referredBy: "",
    procedureInterestId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    const origin = form.referredBy && form.origin === "manual" ? "indicacao" : form.origin;
    addLead({
      name: form.name,
      phone: form.phone,
      origin,
      stage: form.stage,
      service: form.services[0] ?? "",
      services: form.services,
      value: parseFloat(form.value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
      lastMessage: form.lastMessage,
      lastInteraction: new Date().toISOString(),
      observations: form.observations,
      referredByLeadId: form.referredBy || null,
      procedureInterestId: form.procedureInterestId || null,
    } as any);
    setForm({
      name: "", phone: "", origin: "manual", services: [],
      value: "", lastMessage: "", observations: "", stage: "lead_entrou",
      referredBy: "", procedureInterestId: "",
    });
    onClose();
  };

  const set = (field: string, value: any) => setForm({ ...form, [field]: value });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome *</label>
            <input className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Telefone *</label>
            <input className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Origem</label>
            <select className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={form.origin} onChange={(e) => set("origin", e.target.value)}>
              {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Procedimento de interesse</label>
            <select className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={form.procedureInterestId} onChange={(e) => set("procedureInterestId", e.target.value)}>
              <option value="">— Nenhum —</option>
              {procedures.filter(p => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Indicado por (opcional)</label>
            <select className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)}>
              <option value="">Ninguém / captação direta</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Etapa inicial</label>
            <select className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={form.stage} onChange={(e) => set("stage", e.target.value)}>
              {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Serviços de interesse</label>
            <ServiceBadges value={form.services} onChange={(v) => set("services", v)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
            <input className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Última mensagem</label>
            <textarea className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" rows={2} value={form.lastMessage} onChange={(e) => set("lastMessage", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" rows={2} value={form.observations} onChange={(e) => set("observations", e.target.value)} />
          </div>
          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors mr-2">
              Cancelar
            </button>
            <button type="submit" className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Criar lead
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewLeadModal;
