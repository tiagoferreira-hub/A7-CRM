import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface CompanyMember { userId: string; displayName: string; }

export const useCompanyMembers = (): CompanyMember[] => {
  const { activeCompanyId } = useAuth();
  const [members, setMembers] = useState<CompanyMember[]>([]);

  useEffect(() => {
    if (!activeCompanyId) { setMembers([]); return; }
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("user_id, display_name")
        .eq("company_id", activeCompanyId);
      setMembers((data ?? []).map((r: any) => ({
        userId: r.user_id, displayName: r.display_name ?? "—",
      })));
    })();
  }, [activeCompanyId]);

  return members;
};
