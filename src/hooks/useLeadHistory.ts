import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeadHistoryEvent } from "@/types/automations";

export const useLeadHistory = (leadId: string | null | undefined): LeadHistoryEvent[] => {
  const [events, setEvents] = useState<LeadHistoryEvent[]>([]);
  useEffect(() => {
    if (!leadId) { setEvents([]); return; }
    (async () => {
      const { data } = await (supabase as any).from("lead_history")
        .select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
      setEvents((data ?? []).map((r: any) => ({
        id: r.id, leadId: r.lead_id, eventType: r.event_type,
        actorId: r.actor_id, payload: r.payload ?? {}, createdAt: r.created_at,
      })));
    })();
  }, [leadId]);
  return events;
};
