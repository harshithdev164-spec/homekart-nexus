import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Properties from "./pages/Properties";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/leads" element={<DashboardLayout><Leads /></DashboardLayout>} />
            <Route path="/properties" element={<DashboardLayout><Properties /></DashboardLayout>} />
            <Route path="/activities" element={<DashboardLayout><div>Activities page coming soon...</div></DashboardLayout>} />
            <Route path="/team" element={<DashboardLayout><div>Team page coming soon...</div></DashboardLayout>} />
            <Route path="/reports" element={<DashboardLayout><div>Reports page coming soon...</div></DashboardLayout>} />
            <Route path="/calendar" element={<DashboardLayout><div>Calendar page coming soon...</div></DashboardLayout>} />
            <Route path="/messages" element={<DashboardLayout><div>Messages page coming soon...</div></DashboardLayout>} />
            <Route path="/documents" element={<DashboardLayout><div>Documents page coming soon...</div></DashboardLayout>} />
            <Route path="/settings" element={<DashboardLayout><div>Settings page coming soon...</div></DashboardLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
