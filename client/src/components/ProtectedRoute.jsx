import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * ProtectedRoute
 *
 * Props:
 *   role  — string ("technician") or array (["admin", "superadmin"])
 *           Defines which roles are allowed to render children.
 *
 * Redirect logic when role doesn't match:
 *   technician → /dashboard
 *   admin      → /admin
 *   superadmin → /admin
 *
 * This means if a technician tries to hit /admin they go to /dashboard,
 * and if an admin/superadmin tries to hit /dashboard they go to /admin.
 */
export default function ProtectedRoute({ role, children }) {
  const { token, user } = useAuthStore();

  // No session at all → login
  if (!token || !user) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(user.role)) {
    // Send them to the right home for their actual role
  // FIX — add one case
if (user.role === "technician") return <Navigate to="/dashboard" replace />;
if (user.role === "security")   return <Navigate to="/security"  replace />; // ← ADD
return <Navigate to="/admin" replace />; // admin and superadmin
  }

  return children;
}