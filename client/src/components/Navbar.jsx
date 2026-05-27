import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  const navLinkStyle = (path) => ({
    fontSize: "13px",
    fontWeight: "500",
    color: location.pathname === path ? "var(--blue-light)" : "var(--steel)",
    textDecoration: "none",
    padding: "6px 10px",
    borderRadius: "7px",
    background: location.pathname === path ? "rgba(59,143,255,0.08)" : "transparent",
    transition: "color 0.15s, background 0.15s",
  });

  return (
    <nav className="navbar">
      {/* Brand */}
      <Link
        to={isAdmin ? "/admin" : "/dashboard"}
        style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
      >
        <div style={{
          width: 32, height: 32,
          background: "var(--blue)", borderRadius: "7px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", fontWeight: "700", color: "#fff",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          ML
        </div>
        <span style={{ fontWeight: "700", fontSize: "15px", color: "var(--white)" }}>
          {isAdmin ? "Admin" : "Technician"}
        </span>
      </Link>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

        {/* Admin nav links */}
        {isAdmin && (
          <>
            <Link to="/admin" style={navLinkStyle("/admin")}>Dashboard</Link>
            <Link to="/admin/analytics" style={navLinkStyle("/admin/analytics")}>Analytics</Link>
          </>
        )}

        {/* User pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 10px",
          background: "var(--navy-light)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          marginLeft: "4px",
        }}>
          <div style={{
            width: 28, height: 28,
            background: "var(--blue)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: "700", color: "#fff",
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span style={{
            fontSize: "13px", fontWeight: "500", color: "var(--white-dim)",
            maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user?.name}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "8px", padding: "8px 12px",
            color: "var(--steel)", fontSize: "13px", cursor: "pointer",
            fontFamily: "'IBM Plex Sans', sans-serif",
            transition: "all 0.2s",
          }}
          onMouseOver={e => {
            e.currentTarget.style.color = "var(--danger)";
            e.currentTarget.style.borderColor = "var(--danger)";
          }}
          onMouseOut={e => {
            e.currentTarget.style.color = "var(--steel)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}