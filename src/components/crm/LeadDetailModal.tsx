import React, { useState } from "react";
import { Lead, STAGE_LABELS, STAGE_ORDER, ORIGIN_LABELS, ORIGIN_OPTIONS, LeadStage, LeadOrigin } from "@/types/lead";
import { useLeads } from "@/context/LeadsContext";
import { useServices } from "@/context/ServicesContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const LeadDetailModal: React.FC<Props> = ({ lead, open, onClose }) => {
  const { updateLead, moveLead } = useLeads();
  const { services } = useServices();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({});

  if (!lead) return null;

  const startEdit = () => {
    setForm({
      name: lead.name,
      phone: lead.phone,
      origin: lead.origin,
      service: lead.service,
      value: lead.value,
      lastMessage: lead.lastMessage,
      observations: lead.observations,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    const val = typeof form.value === "string"
      ? parseFloat((form.value as string).replace(/[^\d.,]/g, "").replace(",", ".")) || 0
      : form.value;
    updateLead(lead.id, { ...form, value: val as number });
    setEditing(false);
  };

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground mt-0.5">{value}</div>
    </div>
  );

  const InputField = ({ label, field, textarea }: { label: string; field: keyof Lead; textarea?: boolean }) => {
    const Tag = textarea ? "textarea" : "input";
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <Tag
          className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          value={(form[field] as string) ?? ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          rows={textarea ? 3 : undefined}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{lead.name}</DialogTitle>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefone" value={lead.phone} />
              <Field label="Etapa atual" value={
                <select
                  className="text-sm border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  value={lead.stage}
                  onChange={(e) => moveLead(lead.id, e.target.value as LeadStage)}
                >
                  {STAGE_ORDER.map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              } />
              <Field label="Origem" value={ORIGIN_LABELS[lead.origin]} />
              <Field label="Serviço" value={lead.service} />
              <Field label="Valor" value={formatCurrency(lead.value)} />
              <Field label="Última interação" value={formatDateTime(lead.lastInteraction)} />
            </div>
            <Field label="Última mensagem" value={lead.lastMessage} />
            <Field label="Observações" value={lead.observations || "—"} />
            <Field label="Data de criação" value={formatDateTime(lead.createdAt)} />

            <div className="flex justify-end pt-2">
              <button
                onClick={startEdit}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Editar lead
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <InputField label="Nome" field="name" />
            <InputField label="Telefone" field="phone" />
            <div>
              <label className="text-xs font-medium text-muted-foreground">Origem</label>
              <select
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.origin ?? lead.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value as LeadOrigin })}
              >
                {ORIGIN_OPTIONS.map((o) => (
                  <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Serviço de interesse</label>
              <select
                className="w-full mt-0.5 text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.service ?? lead.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              >
                <option value="">Selecione o serviço</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <InputField label="Valor (R$)" field="value" />
            <InputField label="Última mensagem" field="lastMessage" textarea />
            <InputField label="Observações" field="observations" textarea />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditing(false)}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailModal;
