import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

/* ─── Admin nav items ──────────────────────────────────────────── */
const ADMIN_NAV = [
  { path: "/admin",           label: "Dashboard"   },
  { path: "/admin/analytics", label: "Analytics"   },
  // add more admin routes here as needed
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate          = useNavigate();
  const location          = useLocation();
  const isAdmin           = user?.role === "admin";

  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef                   = useRef(null);

  /* close menu on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  /* close menu on route change */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* ── inline styles (keeps it self-contained / no extra CSS file needed) ── */
  const s = {
    nav: {
      position: "sticky",
      top: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      height: "52px",
      background: "#09090B",
      borderBottom: "1px solid #27272A",
      fontFamily: "'IBM Plex Sans', sans-serif",
    },

    /* brand */
    brand: { textDecoration: "none", flexShrink: 0, lineHeight: 1 },
    brandName: {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: "17px",
      fontWeight: "700",
      letterSpacing: "0.06em",
      color: "#FAFAFA",
      textTransform: "uppercase",
    },
    brandSub: {
      fontSize: "7px",
      letterSpacing: "0.18em",
      color: "#71717A",
      fontWeight: "600",
      textTransform: "uppercase",
      marginTop: "2px",
    },

    /* right cluster */
    right: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      borderLeft: "1px solid #27272A",
      paddingLeft: "14px",
    },

    /* user info */
    userBlock: { textAlign: "right" },
    userName: {
      fontSize: "11px",
      fontWeight: "500",
      color: "#FAFAFA",
      lineHeight: 1,
      maxWidth: "110px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    userBranch: {
      fontSize: "8px",
      letterSpacing: "0.12em",
      color: "#71717A",
      textTransform: "uppercase",
      marginTop: "2px",
      fontWeight: "600",
    },

    /* sign out */
    signOut: {
      background: "transparent",
      border: "1px solid #27272A",
      padding: "6px 12px",
      color: "#71717A",
      fontSize: "9px",
      fontWeight: "600",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "'IBM Plex Sans', sans-serif",
      borderRadius: 0,
      flexShrink: 0,
      transition: "border-color 0.15s, color 0.15s",
    },

    /* hamburger button (admin) */
    burger: {
      background: "transparent",
      border: "1px solid #27272A",
      padding: "6px 10px",
      cursor: "pointer",
      color: "#A1A1AA",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "border-color 0.15s",
    },
    burgerLine: {
      width: "16px",
      height: "1.5px",
      background: "currentColor",
      display: "block",
      transition: "transform 0.2s, opacity 0.2s",
    },

    /* dropdown menu (admin) */
    menuWrapper: {
      position: "absolute",
      top: "52px",
      right: 0,
      left: 0,
      background: "#09090B",
      borderBottom: "1px solid #27272A",
      overflow: "hidden",
      transition: "max-height 0.25s ease, opacity 0.2s ease",
      zIndex: 99,
    },
    menuInner: {
      padding: "8px 16px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
    menuSeparator: {
      height: "1px",
      background: "#27272A",
      margin: "6px 0",
    },
  };

  /* ── admin mobile menu link ── */
  const AdminMenuLink = ({ path, label }) => {
    const active = location.pathname === path;
    return (
      <Link
        to={path}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 4px",
          fontSize: "11px",
          fontWeight: "600",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: active ? "#FAFAFA" : "#71717A",
          textDecoration: "none",
          borderBottom: `1px solid ${active ? "#3F3F46" : "transparent"}`,
          transition: "color 0.15s",
        }}
      >
        {active && (
          <span style={{ width: "3px", height: "14px", background: "#FAFAFA", display: "inline-block", flexShrink: 0 }} />
        )}
        {label}
      </Link>
    );
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <nav style={s.nav} className="aml-navbar">
        {/* ── Brand ── */}
        <Link
          to={isAdmin ? "/admin" : "/dashboard"}
          style={s.brand}
        >
          <div style={s.brandName}>AML MOTORS</div>
          <div style={s.brandSub}>{isAdmin ? "Admin Portal" : "Technician Portal"}</div>
        </Link>

        {/* ── Right cluster ── */}
        <div style={s.right}>
          {/* User info */}
          <div style={s.userBlock}>
            <div style={s.userName}>{user?.name}</div>
            {user?.branch && <div style={s.userBranch}>{user.branch}</div>}
          </div>

          {/* Technician: just Sign Out, no nav links */}
          {!isAdmin && (
            <button
              onClick={handleLogout}
              style={s.signOut}
              onMouseOver={e => {
                e.currentTarget.style.borderColor = "#EF4444";
                e.currentTarget.style.color = "#EF4444";
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = "#27272A";
                e.currentTarget.style.color = "#71717A";
              }}
            >
              Sign Out
            </button>
          )}

          {/* Admin: hamburger menu */}
          {isAdmin && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                ...s.burger,
                borderColor: menuOpen ? "#52525B" : "#27272A",
                color: menuOpen ? "#FAFAFA" : "#A1A1AA",
              }}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {/* animated hamburger → X */}
              <span style={{
                ...s.burgerLine,
                transform: menuOpen ? "translateY(5.5px) rotate(45deg)" : "none",
              }} />
              <span style={{
                ...s.burgerLine,
                opacity: menuOpen ? 0 : 1,
              }} />
              <span style={{
                ...s.burgerLine,
                transform: menuOpen ? "translateY(-5.5px) rotate(-45deg)" : "none",
              }} />
            </button>
          )}
        </div>
      </nav>

      {/* ── Admin slide-down menu ── */}
      {isAdmin && (
        <div
          style={{
            ...s.menuWrapper,
            maxHeight: menuOpen ? "400px" : "0px",
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? "auto" : "none",
          }}
          aria-hidden={!menuOpen}
        >
          <div style={s.menuInner}>
            {ADMIN_NAV.map(({ path, label }) => (
              <AdminMenuLink key={path} path={path} label={label} />
            ))}
            <div style={s.menuSeparator} />
            {/* Sign out inside menu for admin */}
            <button
              onClick={handleLogout}
              style={{
                ...s.signOut,
                textAlign: "left",
                padding: "10px 4px",
                border: "none",
                fontSize: "11px",
                letterSpacing: "0.12em",
              }}
              onMouseOver={e => { e.currentTarget.style.color = "#EF4444"; }}
              onMouseOut={e => { e.currentTarget.style.color = "#71717A"; }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}