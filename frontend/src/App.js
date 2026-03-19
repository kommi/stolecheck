import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import AuthCallback from "@/pages/AuthCallback";
import VictimDashboard from "@/pages/VictimDashboard";
import BuyerVerification from "@/pages/BuyerVerification";
import LawEnforcementDashboard from "@/pages/LawEnforcementDashboard";
import AdminPanel from "@/pages/AdminPanel";
import LawAlerts from "@/pages/LawAlerts";
import LawCases from "@/pages/LawCases";
import LawItems from "@/pages/LawItems";

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'law_enforcement':
      return <LawEnforcementDashboard />;
    case 'admin':
      return <AdminPanel />;
    case 'buyer':
      return <BuyerVerification />;
    default:
      return <VictimDashboard />;
  }
}

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id - detect DURING RENDER, not in useEffect
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><DashboardRouter /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/verify" element={
        <ProtectedRoute>
          <Layout><BuyerVerification /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/law/alerts" element={
        <ProtectedRoute roles={['law_enforcement', 'admin']}>
          <Layout><LawAlerts /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/law/cases" element={
        <ProtectedRoute roles={['law_enforcement', 'admin']}>
          <Layout><LawCases /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/law/items" element={
        <ProtectedRoute roles={['law_enforcement', 'admin']}>
          <Layout><LawItems /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><AdminPanel /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/analytics" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><AdminPanel /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#0B0D12',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F8FAFC',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
