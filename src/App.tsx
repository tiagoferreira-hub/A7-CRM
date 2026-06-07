import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ServicesProvider } from "@/context/ServicesContext";
import { LeadsProvider } from "@/context/LeadsContext";
import { KeywordRulesProvider } from "@/context/KeywordRulesContext";
import { ProceduresProvider } from "@/context/ProceduresContext";
import { TasksProvider } from "@/context/TasksContext";
import { DocumentsProvider } from "@/context/DocumentsContext";
import { ConversationsProvider } from "@/context/ConversationsContext";
import { AppointmentsProvider } from "@/context/AppointmentsContext";
import { FollowUpsProvider } from "@/context/FollowUpsContext";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { TagsProvider } from "@/context/TagsContext";
import { AutomationFlowsProvider } from "@/context/AutomationFlowsContext";
import { PlaybooksProvider } from "@/context/PlaybooksContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import OwnerPanel from "./pages/OwnerPanel";
import NotFound from "./pages/NotFound";
import Capture from "./pages/Capture";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, role, loading, viewAsCompany } = useAuth();

  // Rota PÚBLICA de captação por indicação — sem login, antes de qualquer gate.
  if (window.location.pathname.startsWith("/indique/")) {
    return <Capture />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Owner without viewing a specific company → show owner panel
  if (role === "owner" && !viewAsCompany) {
    return (
      <Routes>
        <Route path="/" element={<OwnerPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Owner viewing a company OR client/admin/seller → show CRM
  return (
    <ServicesProvider>
      <LeadsProvider>
        <KeywordRulesProvider>
        <ProceduresProvider>
        <TagsProvider>
          <TasksProvider>
            <DocumentsProvider>
              <AppointmentsProvider>
                <FollowUpsProvider>
                  <CampaignsProvider>
                    <ConversationsProvider>
                      <AutomationFlowsProvider>
                        <PlaybooksProvider>
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </PlaybooksProvider>
                      </AutomationFlowsProvider>

                    </ConversationsProvider>
                  </CampaignsProvider>
                </FollowUpsProvider>
              </AppointmentsProvider>
            </DocumentsProvider>
          </TasksProvider>
        </TagsProvider>
        </ProceduresProvider>
        </KeywordRulesProvider>
      </LeadsProvider>
    </ServicesProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
