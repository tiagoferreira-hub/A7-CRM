import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LOSS_REASON_LABELS, LOSS_REASON_OPTIONS, LossReason } from "@/types/automations";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const LossReasonModal: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  const [reason, setReason] = useState<LossReason>("sem_interesse");
  const [other, setOther] = useState("");

  const handleConfirm = () => {
    const value = reason === "outro" ? (other.trim() || "Outro") : LOSS_REASON_LABELS[reason];
    onConfirm(value);
    setReason("sem_interesse");
    setOther("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Motivo da perda</DialogTitle></DialogHeader>
        <div className="space-y-2 mt-2">
          {LOSS_REASON_OPTIONS.map(r => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={reason === r} onChange={() => setReason(r)} />
              {LOSS_REASON_LABELS[r]}
            </label>
          ))}
          {reason === "outro" && (
            <input
              autoFocus
              value={other}
              onChange={e => setOther(e.target.value)}
              placeholder="Descreva o motivo"
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent">Cancelar</button>
            <button onClick={handleConfirm} className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Confirmar</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LossReasonModal;
