import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

/* ─── Admin nav items ──────────────────────────────────────────── */
const ADMIN_NAV = [
  { path: "/admin",             label: "Dashboard"  },
  { path: "/admin/analytics",   label: "Analytics"  },
  { path: "/admin/attendance",  label: "Attendance" }, // ← new
];

/* ─── Injected styles ──────────────────────────────────────────── */
const NAV_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

  .aml-nav-root {
    position: sticky;
    top: 0;
    z-index: 100;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* 3px brand stripe */
  .aml-nav-stripe {
    height: 3px;
    background: #1E3A8A;
    width: 100%;
  }

  /* Main bar */
  .aml-nav-bar {
    height: 52px;
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
  }

  /* Left side */
  .aml-nav-left {
    display: flex;
    align-items: center;
    height: 52px;
    min-width: 0;
    flex: 1;
  }

  /* Brand */
  .aml-brand {
    text-decoration: none;
    line-height: 1;
    flex-shrink: 0;
  }
  .aml-brand-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #0A1628;
    text-transform: uppercase;
    line-height: 1;
  }
  .aml-brand-sub {
    font-size: 7.5px;
    letter-spacing: 0.16em;
    color: #6B7A99;
    font-weight: 600;
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* Brand/nav divider */
  .aml-brand-sep {
    display: none;
    width: 1px;
    height: 22px;
    background: #DDE3EE;
    margin: 0 16px;
    flex-shrink: 0;
  }

  /* Desktop nav links */
  .aml-desktop-nav {
    display: none;
    align-items: center;
    height: 52px;
  }
  .aml-desktop-link {
    height: 52px;
    display: flex;
    align-items: center;
    padding: 0 13px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6B7A99;
    text-decoration: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    white-space: nowrap;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .aml-desktop-link:hover  { color: #1E3A8A; }
  .aml-desktop-link.active { color: #1E3A8A; border-bottom-color: #1E3A8A; }

  /* Right cluster */
  .aml-nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  /* Vertical divider */
  .aml-vert-sep {
    width: 1px;
    height: 22px;
    background: #DDE3EE;
    flex-shrink: 0;
  }

  /* User info */
  .aml-user { text-align: right; }
  .aml-user-name {
    font-size: 11px;
    font-weight: 600;
    color: #0A1628;
    line-height: 1;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .aml-user-branch {
    font-size: 8px;
    letter-spacing: 0.12em;
    color: #6B7A99;
    text-transform: uppercase;
    margin-top: 3px;
    font-weight: 600;
  }
  /* Generic role line — blue for admin/superadmin */
  .aml-user-role {
    font-size: 8px;
    letter-spacing: 0.12em;
    color: #1E3A8A;
    text-transform: uppercase;
    margin-top: 3px;
    font-weight: 600;
  }
  /* Superadmin gets a slightly different accent so it's visually distinct */
  .aml-user-role--superadmin {
    color: #7C3AED;
  }

  /* Sign Out button */
  .aml-signout {
    background: transparent;
    border: 1px solid #DDE3EE;
    padding: 7px 13px;
    color: #6B7A99;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0;
    flex-shrink: 0;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    -webkit-appearance: none;
  }
  .aml-signout:hover  { border-color: #DC2626; color: #DC2626; background: #FEF2F2; }
  .aml-signout:active { background: #FEE2E2; }

  /* Admin desktop sign-out — hidden on mobile */
  .aml-signout-desktop { display: none; }

  /* Hamburger — mobile only */
  .aml-burger {
    display: flex;
    flex-direction: column;
    gap: 4.5px;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid #DDE3EE;
    padding: 9px 10px;
    cursor: pointer;
    border-radius: 0;
    flex-shrink: 0;
    transition: border-color 0.15s ease, background 0.15s ease;
    -webkit-appearance: none;
  }
  .aml-burger:hover      { border-color: #1E3A8A; }
  .aml-burger.open       { border-color: #1E3A8A; background: #F0F4FF; }
  .aml-burger-line {
    width: 15px;
    height: 1.5px;
    background: #374151;
    display: block;
    transition: transform 0.22s ease, opacity 0.18s ease;
  }

  /* Mobile dropdown */
  .aml-mobile-menu {
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
    overflow: hidden;
    transition: max-height 0.28s ease, opacity 0.22s ease;
  }
  .aml-mobile-menu-inner {
    padding: 4px 16px 14px;
    display: flex;
    flex-direction: column;
  }
  .aml-mobile-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #6B7A99;
    text-decoration: none;
    border-bottom: 1px solid #F1F5F9;
    transition: color 0.15s ease;
  }
  .aml-mobile-link.active { color: #1E3A8A; }
  .aml-mobile-link:hover  { color: #1E3A8A; }
  .aml-mobile-active-bar {
    width: 3px;
    height: 13px;
    background: #1E3A8A;
    flex-shrink: 0;
  }
  .aml-mobile-sep {
    height: 1px;
    background: #EEF2F7;
    margin: 2px 0;
  }
  .aml-mobile-signout {
    background: transparent;
    border: none;
    padding: 13px 0;
    color: #6B7A99;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    text-align: left;
    -webkit-appearance: none;
    transition: color 0.15s ease;
  }
  .aml-mobile-signout:hover { color: #DC2626; }

  /* ── Desktop breakpoint ≥640px ── */
  @media (min-width: 640px) {
    .aml-nav-bar    { padding: 0 24px; }
    .aml-nav-right  { gap: 14px; }
    .aml-brand-sep   { display: block; }
    .aml-desktop-nav { display: flex; }
    .aml-signout-desktop { display: block; }
    .aml-burger          { display: none; }
    .aml-mobile-menu     { display: none !important; }
  }

  @media (min-width: 1024px) {
    .aml-nav-bar    { padding: 0 32px; }
    .aml-brand-name { font-size: 19px; }
    .aml-user-name  { max-width: 160px; }
  }
`;

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate         = useNavigate();
  const location         = useLocation();

  /**
   * isAdminOrAbove — true for "admin" (branch) AND "superadmin".
   * This replaces the old `isAdmin` which only checked for "admin"
   * and left superadmins with a broken technician-style navbar.
   */
  const isAdminOrAbove = ["admin", "superadmin"].includes(user?.role);
  const isSuperAdmin   = user?.role === "superadmin";
  const isBranchAdmin  = user?.role === "admin";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef                 = useRef(null);

  /* inject styles once */
  useEffect(() => {
    const id = "aml-navbar-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = NAV_STYLES;
      document.head.appendChild(el);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

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

  /**
   * Portal label under the brand name.
   * superadmin → "Super Admin Portal"
   * admin      → "Admin Portal"
   * technician → "Technician Portal"
   */
  const portalLabel = isSuperAdmin
    ? "Super Admin Portal"
    : isBranchAdmin
    ? "Admin Portal"
    : "Technician Portal";

  /**
   * Role line shown under the user's name in the right cluster.
   * superadmin  → purple "Super Admin"
   * branch admin → blue "Branch Admin · <BranchName>"
   * technician  → gray branch name (or nothing if branch not set yet)
   */
  const renderUserMeta = () => {
    if (isSuperAdmin) {
      return (
        <div className="aml-user-role aml-user-role--superadmin">
          Super Admin
        </div>
      );
    }
    if (isBranchAdmin) {
      return (
        <div className="aml-user-role">
          Branch Admin{user?.branch ? ` · ${user.branch}` : ""}
        </div>
      );
    }
    // Technician
    return user?.branch
      ? <div className="aml-user-branch">{user.branch}</div>
      : null;
  };

  return (
    <div className="aml-nav-root" ref={menuRef}>

      {/* 3px accent stripe */}
      <div className="aml-nav-stripe" />

      {/* Main bar */}
      <div className="aml-nav-bar">

        {/* ── Left: Brand + desktop nav ── */}
        <div className="aml-nav-left">
          <Link
            to={isAdminOrAbove ? "/admin" : "/dashboard"}
            className="aml-brand"
          >
            <div className="aml-brand-name">AML MOTORS</div>
            <div className="aml-brand-sub">{portalLabel}</div>
          </Link>

          {/* Separator + desktop nav — admin/superadmin only, visible ≥640px */}
          {isAdminOrAbove && (
            <>
              <div className="aml-brand-sep" />
              <nav className="aml-desktop-nav" aria-label="Admin navigation">
                {ADMIN_NAV.map(({ path, label }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`aml-desktop-link${location.pathname === path ? " active" : ""}`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </>
          )}
        </div>

        {/* ── Right cluster ── */}
        <div className="aml-nav-right">

          <div className="aml-vert-sep" />

          {/* User info */}
          <div className="aml-user">
            <div className="aml-user-name">{user?.name}</div>
            {renderUserMeta()}
          </div>

          {/* Technician: sign out always visible in bar */}
          {!isAdminOrAbove && (
            <button className="aml-signout" onClick={handleLogout}>
              Sign Out
            </button>
          )}

          {/* Admin/Superadmin desktop sign-out (hidden on mobile via CSS) */}
          {isAdminOrAbove && (
            <button
              className="aml-signout aml-signout-desktop"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          )}

          {/* Admin/Superadmin mobile hamburger (hidden on desktop via CSS) */}
          {isAdminOrAbove && (
            <button
              className={`aml-burger${menuOpen ? " open" : ""}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className="aml-burger-line" style={{
                transform: menuOpen ? "translateY(6px) rotate(45deg)" : "none",
              }} />
              <span className="aml-burger-line" style={{
                opacity: menuOpen ? 0 : 1,
              }} />
              <span className="aml-burger-line" style={{
                transform: menuOpen ? "translateY(-6px) rotate(-45deg)" : "none",
              }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Admin/Superadmin mobile slide-down menu ── */}
      {isAdminOrAbove && (
        <div
          className="aml-mobile-menu"
          style={{
            maxHeight:     menuOpen ? "400px" : "0px",
            opacity:       menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? "auto" : "none",
          }}
          aria-hidden={!menuOpen}
        >
          <div className="aml-mobile-menu-inner">
            {ADMIN_NAV.map(({ path, label }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`aml-mobile-link${active ? " active" : ""}`}
                >
                  {active && <span className="aml-mobile-active-bar" />}
                  {label}
                </Link>
              );
            })}
            <div className="aml-mobile-sep" />
            <button className="aml-mobile-signout" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}