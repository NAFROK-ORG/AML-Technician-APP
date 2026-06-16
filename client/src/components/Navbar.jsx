import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

/* ─── Admin nav items ──────────────────────────────────────────────
   superadminOnly: true  → link only renders for superadmin role.
   superadminOnly: false → link renders for both admin and superadmin.
   visibleNav (computed below) handles the filtering before render.

   Security users see NO nav links — their Navbar is logo + logout only.
   Do not add security-specific items here; the security page has one route.
─────────────────────────────────────────────────────────────────── */
const ADMIN_NAV = [
  { path: "/admin",                label: "Dashboard",      superadminOnly: false },
  { path: "/admin/analytics",      label: "Analytics",      superadminOnly: false },
  { path: "/admin/attendance",     label: "Attendance",     superadminOnly: false },
  { path: "/admin/vehicle-log",    label: "Vehicle Log",    superadminOnly: false },
  { path: "/admin/vehicle-search", label: "Vehicle Search", superadminOnly: true  },
  { path: "/admin/audit-log",      label: "Audit Log",      superadminOnly: true  },
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
    /* Safety net: never let children punch outside the bar */
    overflow: hidden;
  }

  /* Left side
     flex: 1        → absorbs all space the right cluster leaves
     min-width: 0   → allows children to shrink below content size (critical)
     overflow:hidden → clips anything that still overflows; nothing escapes into right cluster
  */
  .aml-nav-left {
    display: flex;
    align-items: center;
    height: 52px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }

  /* ── Brand link ──
     flex-shrink: 0  → brand never gets squished; it is the identity anchor
     Logo + text sit in a single flex row with a small gap
  */
  .aml-brand {
    text-decoration: none;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  /* Logo icon — sized per breakpoint below */
  .aml-brand-logo {
    height: 20px;
    width: auto;
    display: block;
    object-fit: contain;
    flex-shrink: 0;
  }

  /* Text stack: AML MOTORS + portal label */
  .aml-brand-text {
    display: flex;
    flex-direction: column;
    line-height: 1;
    min-width: 0;
  }

  .aml-brand-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #0A1628;
    text-transform: uppercase;
    line-height: 1;
    white-space: nowrap;
  }
  .aml-brand-sub {
    font-size: 7px;
    letter-spacing: 0.14em;
    color: #6B7A99;
    font-weight: 600;
    text-transform: uppercase;
    margin-top: 2px;
    white-space: nowrap;
  }

  /* Brand / nav divider — only shown ≥640px */
  .aml-brand-sep {
    display: none;
    width: 1px;
    height: 22px;
    background: #DDE3EE;
    margin: 0 10px;
    flex-shrink: 0;
  }

  /* Desktop nav
     flex-shrink: 1  → this is the zone that compresses first when space is tight;
                       the brand and right cluster are protected
     min-width: 0    → allows it to shrink below natural content width
     overflow:hidden → clips gracefully instead of pushing siblings
  */
  .aml-desktop-nav {
    display: none;
    align-items: center;
    height: 52px;
    flex-shrink: 1;
    min-width: 0;
    overflow: hidden;
  }
  .aml-desktop-link {
    height: 52px;
    display: flex;
    align-items: center;
    padding: 0 9px;
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.12em;
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

  /* Right cluster
     flex-shrink: 0  → never compressed; user info and sign-out are always intact
  */
  .aml-nav-right {
    display: flex;
    align-items: center;
    gap: 8px;
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
    max-width: 100px;
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
  .aml-user-role {
    font-size: 8px;
    letter-spacing: 0.12em;
    color: #1E3A8A;
    text-transform: uppercase;
    margin-top: 3px;
    font-weight: 600;
  }
  .aml-user-role--superadmin { color: #7C3AED; }
  .aml-user-role--security   { color: #B45309; }

  /* Sign Out button */
  .aml-signout {
    background: transparent;
    border: 1px solid #DDE3EE;
    padding: 7px 11px;
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
  .aml-burger:hover { border-color: #1E3A8A; }
  .aml-burger.open  { border-color: #1E3A8A; background: #F0F4FF; }
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

  /* ── 640px — desktop nav appears, tight spacing ─────────────────
     Logo 20px, link padding 0 9px — fits 4 admin links comfortably,
     6 superadmin links snugly. nav shrinks before brand or right cluster.
  ── */
  @media (min-width: 640px) {
    .aml-nav-bar         { padding: 0 20px; }
    .aml-nav-right       { gap: 10px; }
    .aml-brand-sep       { display: block; }
    .aml-desktop-nav     { display: flex; }
    .aml-signout-desktop { display: block; }
    .aml-burger          { display: none; }
    .aml-mobile-menu     { display: none !important; }
  }

  /* ── 900px — comfortable mid-range ──────────────────────────────
     Open up link padding and gap a bit. Superadmin's 6 links have
     more breathing room now.
  ── */
  @media (min-width: 900px) {
    .aml-nav-bar         { padding: 0 24px; }
    .aml-nav-right       { gap: 12px; }
    .aml-brand-sep       { margin: 0 13px; }
    .aml-brand-logo      { height: 22px; }
    .aml-desktop-link    { padding: 0 11px; font-size: 10px; letter-spacing: 0.13em; }
  }

  /* ── 1024px — full comfortable layout ──────────────────────────
     Restore original generous spacing everywhere.
  ── */
  @media (min-width: 1024px) {
    .aml-nav-bar         { padding: 0 32px; }
    .aml-nav-right       { gap: 14px; }
    .aml-brand-sep       { margin: 0 16px; }
    .aml-brand-name      { font-size: 18px; }
    .aml-brand-logo      { height: 24px; }
    .aml-brand           { gap: 8px; }
    .aml-desktop-link    { padding: 0 13px; font-size: 10px; letter-spacing: 0.14em; }
    .aml-user-name       { max-width: 160px; }
  }
`;

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate         = useNavigate();
  const location         = useLocation();

  const isAdminOrAbove = ["admin", "superadmin"].includes(user?.role);
  const isSuperAdmin   = user?.role === "superadmin";
  const isBranchAdmin  = user?.role === "admin";
  const isSecurity     = user?.role === "security";

  const visibleNav = ADMIN_NAV.filter(
    ({ superadminOnly }) => !superadminOnly || isSuperAdmin
  );

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

  const homeRoute = isSecurity
    ? "/security"
    : isAdminOrAbove
    ? "/admin"
    : "/dashboard";

  const portalLabel = isSuperAdmin
    ? "Super Admin Portal"
    : isBranchAdmin
    ? "Admin Portal"
    : isSecurity
    ? "Security Portal"
    : "Technician Portal";

  const renderUserMeta = () => {
    if (isSuperAdmin) {
      return (
        <div className="aml-user-role aml-user-role--superadmin">Super Admin</div>
      );
    }
    if (isBranchAdmin) {
      return (
        <div className="aml-user-role">
          Branch Admin{user?.branch ? ` · ${user.branch}` : ""}
        </div>
      );
    }
    if (isSecurity) {
      return (
        <div className="aml-user-role aml-user-role--security">
          Security{user?.branch ? ` · ${user.branch}` : ""}
        </div>
      );
    }
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

          {/* Brand: [logo]  AML MOTORS / portal label */}
          <Link to={homeRoute} className="aml-brand">
            <img
              src="/aml-motors-pvt.png"
              alt="AML Motors"
              className="aml-brand-logo"
              draggable={false}
            />
            <div className="aml-brand-text">
              <div className="aml-brand-name">AML MOTORS</div>
              <div className="aml-brand-sub">{portalLabel}</div>
            </div>
          </Link>

          {/* Separator + desktop nav — admin/superadmin only, visible ≥640px */}
          {isAdminOrAbove && (
            <>
              <div className="aml-brand-sep" />
              <nav className="aml-desktop-nav" aria-label="Admin navigation">
                {visibleNav.map(({ path, label }) => (
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

          <div className="aml-user">
            <div className="aml-user-name">{user?.name}</div>
            {renderUserMeta()}
          </div>

          {/* Technician + Security: sign out always visible */}
          {!isAdminOrAbove && (
            <button className="aml-signout" onClick={handleLogout}>
              Sign Out
            </button>
          )}

          {/* Admin/Superadmin desktop sign-out */}
          {isAdminOrAbove && (
            <button
              className="aml-signout aml-signout-desktop"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          )}

          {/* Admin/Superadmin mobile hamburger */}
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
            {visibleNav.map(({ path, label }) => {
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