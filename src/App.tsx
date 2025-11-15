import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { OrganizationProvider } from "@/components/organization/OrganizationProvider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Lazy load pages for better performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const OrganizationSetup = lazy(() => import("./pages/OrganizationSetup"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Billing = lazy(() => import("./pages/Billing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const Properties = lazy(() => import("./pages/Properties"));
const EnhancedProperties = lazy(() => import("./pages/EnhancedProperties"));
const Magicbricks = lazy(() => import("./pages/Magicbricks"));
const NinetyNineAcres = lazy(() => import("./pages/NinetyNineAcres"));
const Activities = lazy(() => import("./pages/Activities"));
const Team = lazy(() => import("./pages/Team"));
const Messages = lazy(() => import("./pages/Messages"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Communications = lazy(() => import("./pages/Communications"));
const Reports = lazy(() => import("./pages/Reports"));
const AddListing = lazy(() => import("./pages/AddListing"));
const Marketing = lazy(() => import("./pages/Marketing"));
const HR = lazy(() => import("./pages/HR"));
const Salaries = lazy(() => import("./pages/Salaries"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const ActivityFeed = lazy(() => import("./pages/ActivityFeed"));
const SmartAlerts = lazy(() => import("./pages/SmartAlerts"));
const AITestPage = lazy(() => import("./pages/AITestPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <OrganizationProvider>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin-setup" element={<AdminSetup />} />
                  <Route path="/organization-setup" element={<OrganizationSetup />} />
                  <Route path="/onboarding" element={<DashboardLayout><Onboarding /></DashboardLayout>} />
                  <Route path="/billing" element={<DashboardLayout><Billing /></DashboardLayout>} />
                  <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
                  <Route path="/leads" element={<DashboardLayout><Leads /></DashboardLayout>} />
                  <Route path="/properties" element={<DashboardLayout><Properties /></DashboardLayout>} />
                  <Route path="/enhanced-properties" element={<DashboardLayout><EnhancedProperties /></DashboardLayout>} />
                  <Route path="/add-listing" element={<DashboardLayout><AddListing /></DashboardLayout>} />
                  <Route path="/magicbricks" element={<DashboardLayout><Magicbricks /></DashboardLayout>} />
                  <Route path="/99acres" element={<DashboardLayout><NinetyNineAcres /></DashboardLayout>} />
                  <Route path="/activities" element={<DashboardLayout><Activities /></DashboardLayout>} />
                  <Route path="/team" element={<DashboardLayout><Team /></DashboardLayout>} />
                  <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
                  <Route path="/calendar" element={<DashboardLayout><Calendar /></DashboardLayout>} />
                  <Route path="/messages" element={<DashboardLayout><Messages /></DashboardLayout>} />
                  <Route path="/marketing" element={<DashboardLayout><Marketing /></DashboardLayout>} />
                  <Route path="/hr" element={<DashboardLayout><HR /></DashboardLayout>} />
                  <Route path="/salaries" element={<DashboardLayout><Salaries /></DashboardLayout>} />
                    <Route path="/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
                    <Route path="/activity-feed" element={<DashboardLayout><ActivityFeed /></DashboardLayout>} />
                    <Route path="/alerts" element={<DashboardLayout><SmartAlerts /></DashboardLayout>} />
                    <Route path="/ai-test" element={<DashboardLayout><AITestPage /></DashboardLayout>} />
                  <Route path="/documents" element={<DashboardLayout><div>Documents page coming soon...</div></DashboardLayout>} />
                  <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
                  <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </OrganizationProvider>
            </AuthProvider>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
