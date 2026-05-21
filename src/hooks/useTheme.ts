import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("crm-theme") as Theme) || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("crm-theme", theme);
  }, [theme]);

  // Load theme from profile on auth changes
  useEffect(() => {
    const load = async (userId: string) => {
      const { data } = await (supabase as any)
        .from("profiles").select("theme").eq("user_id", userId).maybeSingle();
      const t = (data?.theme as Theme) || "dark";
      setThemeState(t);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) load(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) setTimeout(() => load(s.user.id), 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await (supabase as any).from("profiles").update({ theme: t }).eq("user_id", session.user.id);
    }
  };

  return {
    theme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    setTheme,
  };
}
