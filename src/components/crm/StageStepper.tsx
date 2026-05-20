import React from "react";
import { ChevronRight } from "lucide-react";
import StageDropdown from "./StageDropdown";
import { LeadStage, LIFECYCLE_STAGES } from "@/types/lead";
import { cn } from "@/lib/utils";

interface Props {
  value: LeadStage;
  onChange: (stage: LeadStage) => void;
  size?: "sm" | "md";
  className?: string;
}

export const nextLifecycleStage = (s: LeadStage): LeadStage | null => {
  const idx = LIFECYCLE_STAGES.indexOf(s);
  if (idx < 0 || idx >= LIFECYCLE_STAGES.length - 1) return null;
  return LIFECYCLE_STAGES[idx + 1];
};

const StageStepper: React.FC<Props> = ({ value, onChange, size = "md", className }) => {
  const next = nextLifecycleStage(value);
  const disabled = !next;
  const btnSize = size === "sm" ? "h-[26px] w-7" : "h-[34px] w-9";

  return (
    <div className={cn("inline-flex items-stretch gap-1", className)}>
      <StageDropdown value={value} onChange={onChange} size={size} className="flex-1" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (next) onChange(next); }}
        disabled={disabled}
        title={next ? "Avançar para próxima etapa" : "Sem próxima etapa"}
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-input bg-background transition-colors",
          btnSize,
          disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
        )}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default StageStepper;
