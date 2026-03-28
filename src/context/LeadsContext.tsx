import React, { createContext, useContext, useState, useCallback } from "react";
import { Lead, LeadStage } from "@/types/lead";
import { sampleLeads } from "@/data/sampleLeads";

interface LeadsContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (id: string, newStage: LeadStage) => void;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export const useLeads = () => {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
};

export const LeadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);

  const addLead = useCallback((lead: Omit<Lead, "id" | "createdAt">) => {
    const newLead: Lead = {
      ...lead,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setLeads((prev) => [newLead, ...prev]);
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }, []);

  const moveLead = useCallback((id: string, newStage: LeadStage) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage: newStage } : l))
    );
  }, []);

  return (
    <LeadsContext.Provider value={{ leads, addLead, updateLead, moveLead }}>
      {children}
    </LeadsContext.Provider>
  );
};
