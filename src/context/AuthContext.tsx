import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "owner" | "client" | "admin" | "seller";

interface AuthState {
  user: User | null;
  role: AppRole | null;
  companyId: string | null;
  displayName: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string, inviteToken?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  viewAsCompany: string | null;
  setViewAsCompany: (companyId: string | null) => void;
  activeCompanyId: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null, role: null, companyId: null, displayName: null, loading: true,
  });
  const [viewAsCompany, setViewAsCompany] = useState<string | null>(null);

  const loadUserData = async (user: User) => {
    // Get role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    setState({
      user,
      role: (roleData?.role as AppRole) ?? null,
      companyId: profile?.company_id ?? roleData?.company_id ?? null,
      displayName: profile?.display_name ?? null,
      loading: false,
    });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock on auth state change
        setTimeout(() => loadUserData(session.user), 0);
      } else {
        setState({ user: null, role: null, companyId: null, displayName: null, loading: false });
        setViewAsCompany(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string, inviteToken?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const activeCompanyId = state.role === "owner" ? viewAsCompany : state.companyId;

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, viewAsCompany, setViewAsCompany, activeCompanyId }}>
      {children}
    </AuthContext.Provider>
  );
};
