import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import ProtectedRoute from "./components/ProtectedRoute";
import PoweredBy from "./components/PoweredBy";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import AdminBranchDashboard from "./pages/AdminBranchDashboard";
import AdminTechnicianList from "./pages/AdminTechnicianList";
import AdminTechnicianDetail from "./pages/AdminTechnicianDetail";
import AdminAnalytics from "./pages/AdminAnalytics";

/**
 * GuestRoute — blocks /login and /signup for already-authenticated users.
 *
 * Redirect logic:
 *   technician → /dashboard
 *   admin      → /admin   (branch-scoped dashboard)
 *   superadmin → /admin   (same component, full cross-branch view)
 */
function GuestRoute({ children }) {
  const { token, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (!hydrated) {
      const unsub = useAuthStore.persist.onFinishHydration(() =>
        setHydrated(true)
      );
      return () => unsub();
    }
  }, [hydrated]);

  if (!hydrated) return null;

  if (token && user) {
    if (user.role === "technician") return <Navigate to="/dashboard" replace />;
    return <Navigate to="/admin" replace />; // admin and superadmin
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public */}
        <Route path="/login"  element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

        {/* Technician only */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="technician">
              <TechnicianDashboard />
            </ProtectedRoute>
          }
        />

        {/*
          Admin + SuperAdmin routes.
          Both roles use the same pages. The difference is:
            - AdminBranchDashboard: branch admin sees only their branch (no pill selector),
              superadmin sees all branches with the pill selector.
            - AdminAnalytics: branch admin has no branch dropdown (forced server-side),
              superadmin has the full branch filter UI.
          The backend enforces all scoping — the frontend just adapts its UI.
        */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <AdminBranchDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branch/:branch"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <AdminTechnicianList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/technician/:userId"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <AdminTechnicianDetail />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <PoweredBy />
    </BrowserRouter>
  );
}