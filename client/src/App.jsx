import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import AdminBranchDashboard from "./pages/AdminBranchDashboard";
import AdminTechnicianList from "./pages/AdminTechnicianList";
import AdminTechnicianDetail from "./pages/AdminTechnicianDetail";
import AdminAnalytics from "./pages/AdminAnalytics";

// Blocks /login and /signup if already logged in
function GuestRoute({ children }) {
  const { token, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (!hydrated) {
      const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
      return () => unsub();
    }
  }, [hydrated]);

  if (!hydrated) return null;

  if (token && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login"  element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

        {/* Technician routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="technician"><TechnicianDashboard /></ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminBranchDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>
        } />
        <Route path="/admin/branch/:branch" element={
          <ProtectedRoute role="admin"><AdminTechnicianList /></ProtectedRoute>
        } />
        <Route path="/admin/technician/:userId" element={
          <ProtectedRoute role="admin"><AdminTechnicianDetail /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}