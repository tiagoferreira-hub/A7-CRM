import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { useServices } from "@/context/ServicesContext";

interface Props {
  value: string[];
  onChange?: (next: string[]) => void;
  size?: "xs" | "sm";
  readOnly?: boolean;
  emptyLabel?: string;
}

const ServiceBadges: React.FC<Props> = ({ value, onChange, size = "sm", readOnly, emptyLabel = "—" }) => {
  const { services } = useServices();
  const [adding, setAdding] = useState(false);
  const list = value ?? [];

  const remove = (s: string) => onChange?.(list.filter(x => x !== s));
  const add = (s: string) => { if (!s || list.includes(s)) return; onChange?.([...list, s]); setAdding(false); };

  const available = services.filter(s => !list.includes(s.name));

  const padding = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {list.length === 0 && readOnly && (
        <span className="text-xs text-muted-foreground">{emptyLabel}</span>
      )}
      {list.map(s => (
        <span
          key={s}
          className={`inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary font-medium ${padding}`}
        >
          {s}
          {!readOnly && (
            <button type="button" onClick={() => remove(s)} className="hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        adding ? (
          <select
            autoFocus
            onBlur={() => setAdding(false)}
            onChange={e => add(e.target.value)}
            defaultValue=""
            className={`rounded-md border border-input bg-background ${padding}`}
          >
            <option value="" disabled>Selecione...</option>
            {available.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={available.length === 0}
            className={`inline-flex items-center gap-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground ${padding} disabled:opacity-40`}
          >
            <Plus className="w-3 h-3" /> adicionar serviço
          </button>
        )
      )}
    </div>
  );
};

export default ServiceBadges;
