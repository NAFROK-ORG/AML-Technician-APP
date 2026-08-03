import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { APP_LOCKED } from "../config/appLock";
import AppLockedScreen from "./AppLockedScreen";

/**
 * ProtectedRoute
 *
 * Props:
 *   role — string or array of strings. Defines which roles may render children.
 *
 * Intercept order:
 *   1. No session → /login
 *   2. APP_LOCKED  → AppLockedScreen (TEMPORARY — see ../config/appLock.js)
 *   3. forcePasswordChange: true → /change-password (unless already there)
 *   4. Role mismatch → role-appropriate home
 *
 * forcePasswordChange guard: uses optional chaining (?.) so existing stored
 * user objects without this field (undefined) safely resolve to falsy.
 * Zero impact on any currently logged-in user.
 */
export default function ProtectedRoute({ role, children }) {
  const { token, user } = useAuthStore();
  const location        = useLocation();

  // No session at all → login
  if (!token || !user) return <Navigate to="/login" replace />;

  // ── TEMPORARY APP LOCK ──────────────────────────────────────
  // Blocks every authenticated page. Login itself is untouched
  // (GuestRoute/Login.jsx never pass through here). Flip
  // APP_LOCKED to false in ../config/appLock.js to remove.
  if (APP_LOCKED) return <AppLockedScreen />;
  // ─────────────────────────────────────────────────────────────

  // Forced password change — intercept BEFORE role check.
  // Exemption: allow through if already on /change-password (prevents redirect loop).
  if (user?.forcePasswordChange && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "technician") return <Navigate to="/dashboard" replace />;
    if (user.role === "security")   return <Navigate to="/security"  replace />;
    return <Navigate to="/admin" replace />;
  }

  return children;
}