import React, { createContext, useContext, useState, useCallback } from "react";

export interface Service {
  id: string;
  name: string;
}

interface ServicesContextType {
  services: Service[];
  addService: (name: string) => void;
  updateService: (id: string, name: string) => void;
  deleteService: (id: string) => void;
}

const ServicesContext = createContext<ServicesContextType | null>(null);

export const useServices = () => {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
};

const defaultServices: Service[] = [
  { id: "1", name: "Harmonização Facial" },
  { id: "2", name: "Botox" },
  { id: "3", name: "Preenchimento Labial" },
  { id: "4", name: "Limpeza de Pele" },
  { id: "5", name: "Peeling Químico" },
  { id: "6", name: "Microagulhamento" },
  { id: "7", name: "Depilação a Laser" },
];

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Service[]>(defaultServices);

  const addService = useCallback((name: string) => {
    setServices((prev) => [...prev, { id: Date.now().toString(), name }]);
  }, []);

  const updateService = useCallback((id: string, name: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  const deleteService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <ServicesContext.Provider value={{ services, addService, updateService, deleteService }}>
      {children}
    </ServicesContext.Provider>
  );
};
