import React from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadStage, STAGE_LABELS, LIFECYCLE_STAGES, LOSS_STAGES } from "@/types/lead";
import { cn } from "@/lib/utils";

interface Props {
  value: LeadStage;
  onChange: (stage: LeadStage) => void;
  size?: "sm" | "md";
  className?: string;
}

const StageDropdown: React.FC<Props> = ({ value, onChange, size = "md", className }) => {
  const sizing =
    size === "sm"
      ? "text-xs px-2 py-1 gap-1"
      : "text-sm px-3 py-1.5 gap-1.5";

  const renderItem = (s: LeadStage) => (
    <DropdownMenuItem
      key={s}
      onClick={(e) => { e.stopPropagation(); onChange(s); }}
      className={cn(
        "cursor-pointer flex items-center justify-between gap-2 rounded-md",
        s === value && "bg-accent font-medium"
      )}
    >
      <span>{STAGE_LABELS[s]}</span>
      {s === value && <Check className="w-3.5 h-3.5 text-primary" />}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center rounded-md border border-input bg-background hover:bg-accent transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
          sizing,
          className
        )}
      >
        <span className="truncate">{STAGE_LABELS[value]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Etapas do ciclo de vida
        </DropdownMenuLabel>
        {LIFECYCLE_STAGES.map(renderItem)}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Etapas de perda
        </DropdownMenuLabel>
        {LOSS_STAGES.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StageDropdown;
