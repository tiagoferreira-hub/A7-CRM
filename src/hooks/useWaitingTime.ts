import { useEffect, useState } from "react";

export type WaitingTier = "fresh" | "warning" | "danger";

export interface WaitingInfo {
  label: string;
  tier: WaitingTier;
  minutes: number;
}

/**
 * Returns a formatted "X sem resposta" string for a given timestamp,
 * recalculated every minute. Returns null when input is falsy.
 *
 * Tiers (used to drive color):
 *  - fresh:   < 60 min   (muted)
 *  - warning: 1h - 24h   (amber/orange)
 *  - danger:  >= 24h     (red)
 */
export function useWaitingTime(since: string | Date | null | undefined): WaitingInfo | null {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!since) return null;
  const ts = typeof since === "string" ? new Date(since).getTime() : since.getTime();
  if (Number.isNaN(ts)) return null;

  const minutes = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  let label: string;
  let tier: WaitingTier;

  if (minutes < 60) {
    label = `${minutes} min sem resposta`;
    tier = "fresh";
  } else if (minutes < 60 * 24) {
    const h = Math.floor(minutes / 60);
    label = `${h}h sem resposta`;
    tier = "warning";
  } else {
    const d = Math.floor(minutes / (60 * 24));
    label = `${d} ${d === 1 ? "dia" : "dias"} sem resposta`;
    tier = "danger";
  }

  return { label, tier, minutes };
}

export const waitingTierClasses: Record<WaitingTier, { text: string; bg: string; border: string }> = {
  fresh:   { text: "text-muted-foreground", bg: "bg-transparent",        border: "border-border" },
  warning: { text: "text-crm-warning",       bg: "bg-crm-warning-light",  border: "border-crm-warning/40" },
  danger:  { text: "text-destructive",       bg: "bg-destructive/10",     border: "border-destructive/40" },
};
