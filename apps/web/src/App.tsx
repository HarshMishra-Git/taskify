import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PageHeaderProvider } from "@/contexts/PageHeaderContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import InvitePage from "@/pages/InvitePage";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import NotFound from "@/pages/NotFound";
import { PageLoader } from "@/components/Loader";

const queryClient = new QueryClient();

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public — guest only */}
      <Route path="/login"  element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

      {/* Public — accessible regardless of auth state */}
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/invite" element={<InvitePage />} />

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <PageHeaderProvider>
              <AppLayout />
            </PageHeaderProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/"             element={<Dashboard />} />
        <Route path="/projects"     element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
