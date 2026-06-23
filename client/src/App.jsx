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
import SecurityDashboard from "./pages/SecurityDashboard";
import VehicleLogBoard from "./pages/VehicleLogBoard";
import VehicleAnalytics from "./pages/VehicleAnalytics";
import AuditLog from "./pages/AuditLog";
import AttendanceAnalytics from "./pages/AttendanceAnalytics"; // ← NEW

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
    if (user.role === "security")   return <Navigate to="/security"  replace />;
    return <Navigate to="/admin" replace />;
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

        {/* Security only */}
        <Route
          path="/security"
          element={
            <ProtectedRoute role="security">
              <SecurityDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin + SuperAdmin */}
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
        <Route
          path="/admin/attendance-analytics"
          element={
            <ProtectedRoute role={["admin", "superadmin"]}>
              <AttendanceAnalytics />
            </ProtectedRoute>
          }
        />
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