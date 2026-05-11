import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Service {
  id: string;
  name: string;
}

interface ServicesContextType {
  services: Service[];
  addService: (name: string) => void;
  updateService: (id: string, name: string) => void;
  deleteService: (id: string) => void;
  loading: boolean;
}

const ServicesContext = createContext<ServicesContextType | null>(null);

export const useServices = () => {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
};

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId, user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const loadServices = useCallback(async () => {
    if (!activeCompanyId) { setServices([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("id, name")
      .eq("company_id", activeCompanyId)
      .order("created_at");
    setServices(data?.map(s => ({ id: s.id, name: s.name })) ?? []);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const addService = useCallback(async (name: string) => {
    if (!activeCompanyId) return;
    const { data } = await supabase
      .from("services")
      .insert({ company_id: activeCompanyId, name })
      .select("id, name")
      .single();
    if (data) setServices(prev => [...prev, { id: data.id, name: data.name }]);
  }, [activeCompanyId]);

  const updateService = useCallback(async (id: string, name: string) => {
    if (!activeCompanyId) return;
    await supabase.from("services").update({ name }).eq("id", id).eq("company_id", activeCompanyId);
    setServices(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, [activeCompanyId]);

  const deleteService = useCallback(async (id: string) => {
    if (!activeCompanyId) return;
    await supabase.from("services").delete().eq("id", id).eq("company_id", activeCompanyId);
    setServices(prev => prev.filter(s => s.id !== id));
  }, [activeCompanyId]);

  return (
    <ServicesContext.Provider value={{ services, addService, updateService, deleteService, loading }}>
      {children}
    </ServicesContext.Provider>
  );
};
