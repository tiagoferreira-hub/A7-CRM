import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const EVENT = "crm-logo-changed";

function storageKey(companyId: string | null) {
  return `crm-logo:${companyId || "default"}`;
}

export function useCompanyLogo() {
  const { activeCompanyId } = useAuth();
  const [logo, setLogoState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(storageKey(activeCompanyId));
  });

  useEffect(() => {
    setLogoState(localStorage.getItem(storageKey(activeCompanyId)));
    const handler = () => setLogoState(localStorage.getItem(storageKey(activeCompanyId)));
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [activeCompanyId]);

  const setLogo = (dataUrl: string | null) => {
    const key = storageKey(activeCompanyId);
    if (dataUrl) localStorage.setItem(key, dataUrl);
    else localStorage.removeItem(key);
    setLogoState(dataUrl);
    window.dispatchEvent(new Event(EVENT));
  };

  return { logo, setLogo };
}
