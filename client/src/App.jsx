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
import AdminAttendance from "./pages/AdminAttendance";
import VehicleSearch from "./pages/VehicleSearch";
import SecurityDashboard from "./pages/SecurityDashboard";   // ← NEW
import VehicleLogBoard from "./pages/VehicleLogBoard";       // ← NEW
import VehicleAnalytics from "./pages/VehicleAnalytics";     // ← NEW (Task 2)
import AuditLog from "./pages/AuditLog";
/**
 * GuestRoute — blocks /login and /signup for already-authenticated users.
 *
 * Redirect logic:
 *   technician → /dashboard
 *   admin      → /admin   (branch-scoped dashboard)
 *   superadmin → /admin   (same component, full cross-branch view)
 *   security   → /security  ← NEW
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
    if (user.role === "security")   return <Navigate to="/security"  replace />; // ← NEW
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
          Security only — ← NEW
          A completely separate page from the technician/admin flows.
          No attendance gate. No admin nav. Just vehicle logging.
        */}
        <Route
          path="/security"
          element={
            <ProtectedRoute role="security">
              <SecurityDashboard />
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
            - AdminAttendance: same pattern — branch admin is locked to their branch,
              superadmin gets a branch filter dropdown.
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
          path="/admin/attendance"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <AdminAttendance />
            </ProtectedRoute>
          }
        />

        {/*
          Vehicle Log Board — ← NEW
          Both branch admins AND superadmins.
          Branch admin: server forces their branch. Superadmin: optional branch filter.
          role is an array — both roles see this page.
        */}
   <Route
          path="/admin/vehicle-log"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <VehicleLogBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vehicle-analytics"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <VehicleAnalytics />
            </ProtectedRoute>
          }
        />
<Route
  path="/admin/audit-log"
  element={
    <ProtectedRoute role="superadmin">
      <AuditLog />
    </ProtectedRoute>
  }
/>
        {/*
          Vehicle Search — superadmin only.
          Branch admins cannot access this route — ProtectedRoute redirects them.
          role is a string (not array) intentionally: this is not shared with admin.
        */}
        <Route
          path="/admin/vehicle-search"
          element={
            <ProtectedRoute role="superadmin">
              <VehicleSearch />
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