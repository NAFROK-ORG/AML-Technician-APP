import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

/* ─── Admin nav structure ───────────────────────────────────────────
   Grouped by JOB, not listed flat — fixes the "too many links" problem
   without inventing a new color per item.

   "Performance" = monitoring / analytical pages (the things an admin
   checks, not acts on day-to-day).
   "Operations"  = live, day-to-day management pages.
   "Admin Tools" = superadmin-exclusive. Uses the SAME purple already
   used for the superadmin role badge elsewhere in this app, so the
   color carries meaning ("privileged") instead of being decorative.

   Security users still see NO nav links — logo + logout only.
─────────────────────────────────────────────────────────────────── */
const NAV_GROUPS = [
  { key: "dashboard", type: "link", path: "/admin", label: "Dashboard" },
  {
    key: "performance",
    type: "group",
    label: "Performance",
    items: [
      { path: "/admin/analytics",              label: "Financial Trends" },
      { path: "/admin/attendance-analytics",    label: "Attendance Trends" },
      { path: "/admin/vehicle-analytics",       label: "Vehicle Trends" },
    ],
  },
  {
    key: "operations",
    type: "group",
    label: "Operations",
    items: [
      { path: "/admin/attendance",   label: "Daily Attendance" },
      { path: "/admin/vehicle-log",  label: "Daily Vehicle Log" },
    ],
  },
];

const SUPERADMIN_GROUP = {
  key: "admin-tools",
  type: "group",
  variant: "superadmin",
  align: "right", // sits near the right edge of the bar — anchor panel right, not left
  label: "Admin Tools",
  items: [
    { path: "/admin/vehicle-search", label: "Vehicle Search" },
    { path: "/admin/audit-log",      label: "Audit Log" },
  ],
};

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

  .aml-nav-stripe { height: 3px; background: #1E3A8A; width: 100%; }

  .aml-nav-bar {
    height: 52px;
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    overflow: visible; /* was hidden — dropdown panels need to escape the bar */
  }

  .aml-nav-left {
    display: flex;
    align-items: center;
    height: 52px;
    min-width: 0;
    flex: 1;
    overflow: visible;
  }

  .aml-brand {
    text-decoration: none;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .aml-brand-logo {
    height: 20px;
    width: auto;
    display: block;
    object-fit: contain;
    flex-shrink: 0;
  }
  .aml-brand-text { display: flex; flex-direction: column; line-height: 1; min-width: 0; }
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

  .aml-brand-sep { display: none; width: 1px; height: 22px; background: #DDE3EE; margin: 0 10px; flex-shrink: 0; }

  .aml-desktop-nav {
    display: none;
    align-items: center;
    height: 52px;
    flex-shrink: 1;
    min-width: 0;
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
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .aml-desktop-link:hover  { color: #1E3A8A; }
  .aml-desktop-link.active { color: #1E3A8A; border-bottom-color: #1E3A8A; }

  /* ── Dropdown nav groups ── */
  .aml-nav-group { position: relative; height: 52px; }

  .aml-dropdown-trigger {
    height: 52px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 9px;
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6B7A99;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    white-space: nowrap;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    transition: color 0.15s ease, border-color 0.15s ease;
    -webkit-appearance: none;
  }
  .aml-dropdown-trigger:hover           { color: #1E3A8A; }
  .aml-dropdown-trigger.active          { color: #1E3A8A; border-bottom-color: #1E3A8A; }
  .aml-dropdown-trigger.open            { color: #1E3A8A; }
  .aml-dropdown-trigger.superadmin               { color: #7C3AED; }
  .aml-dropdown-trigger.superadmin:hover,
  .aml-dropdown-trigger.superadmin.active,
  .aml-dropdown-trigger.superadmin.open          { color: #6D28D9; border-bottom-color: #7C3AED; }

  .aml-dropdown-chevron {
    width: 6px; height: 6px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(45deg);
    margin-top: -2px;
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }
  .aml-dropdown-trigger.open .aml-dropdown-chevron { transform: rotate(225deg); margin-top: 2px; }

  .aml-dropdown-panel {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 200px;
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-top: 2px solid #1E3A8A;
    box-shadow: 0 10px 28px rgba(10,22,40,0.12);
    z-index: 110;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .aml-dropdown-panel.superadmin { border-top-color: #7C3AED; }

  .aml-dropdown-link {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: #374151;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .aml-dropdown-link:hover  { background: #EEF2F7; color: #1E3A8A; }
  .aml-dropdown-link.active { color: #1E3A8A; background: #EEF2F7; font-weight: 700; }
  .aml-dropdown-link.superadmin:hover,
  .aml-dropdown-link.superadmin.active { color: #6D28D9; background: #F5F3FF; }

  /* ── Right cluster ── */
  .aml-nav-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .aml-vert-sep { width: 1px; height: 22px; background: #DDE3EE; flex-shrink: 0; }

  .aml-user { text-align: right; }
  .aml-user-name {
    font-size: 11px; font-weight: 600; color: #0A1628; line-height: 1;
    max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .aml-user-branch {
    font-size: 8px; letter-spacing: 0.12em; color: #6B7A99;
    text-transform: uppercase; margin-top: 3px; font-weight: 600;
  }
  .aml-user-role {
    font-size: 8px; letter-spacing: 0.12em; color: #1E3A8A;
    text-transform: uppercase; margin-top: 3px; font-weight: 600;
  }
  .aml-user-role--superadmin { color: #7C3AED; }
  .aml-user-role--security   { color: #B45309; }

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
  .aml-signout-desktop { display: none; }

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
    width: 15px; height: 1.5px; background: #374151; display: block;
    transition: transform 0.22s ease, opacity 0.18s ease;
  }

  /* ── Mobile dropdown ── */
  .aml-mobile-menu {
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
    overflow: hidden;
    transition: max-height 0.28s ease, opacity 0.22s ease;
  }
  .aml-mobile-menu-inner { padding: 4px 16px 14px; display: flex; flex-direction: column; }

  .aml-mobile-section-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #94A3B8;
    padding: 14px 0 4px;
  }
  .aml-mobile-section-label.superadmin { color: #7C3AED; }

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
  .aml-mobile-link.superadmin.active { color: #7C3AED; }
  .aml-mobile-link.superadmin:hover  { color: #7C3AED; }

  .aml-mobile-active-bar { width: 3px; height: 13px; background: #1E3A8A; flex-shrink: 0; }
  .aml-mobile-active-bar.superadmin { background: #7C3AED; }

  .aml-mobile-sep { height: 1px; background: #EEF2F7; margin: 2px 0; }
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

  @media (min-width: 640px) {
    .aml-nav-bar         { padding: 0 20px; }
    .aml-nav-right       { gap: 10px; }
    .aml-brand-sep       { display: block; }
    .aml-desktop-nav     { display: flex; }
    .aml-signout-desktop { display: block; }
    .aml-burger          { display: none; }
    .aml-mobile-menu     { display: none !important; }
  }

  @media (min-width: 900px) {
    .aml-nav-bar         { padding: 0 24px; }
    .aml-nav-right       { gap: 12px; }
    .aml-brand-sep       { margin: 0 13px; }
    .aml-brand-logo      { height: 22px; }
    .aml-desktop-link, .aml-dropdown-trigger { padding: 0 11px; font-size: 10px; letter-spacing: 0.13em; }
  }

  @media (min-width: 1024px) {
    .aml-nav-bar         { padding: 0 32px; }
    .aml-nav-right       { gap: 14px; }
    .aml-brand-sep       { margin: 0 16px; }
    .aml-brand-name      { font-size: 18px; }
    .aml-brand-logo      { height: 24px; }
    .aml-brand           { gap: 8px; }
    .aml-desktop-link, .aml-dropdown-trigger { padding: 0 13px; font-size: 10px; letter-spacing: 0.14em; }
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

  const visibleGroups = isSuperAdmin ? [...NAV_GROUPS, SUPERADMIN_GROUP] : NAV_GROUPS;

  const [menuOpen, setMenuOpen]               = useState(false);   // mobile slide-down
  const [openDesktopGroup, setOpenDesktopGroup] = useState(null);  // desktop dropdown key
  const menuRef                               = useRef(null);

  /* Inject styles once per session.
     IMPORTANT: this is intentionally NOT removed on unmount.
     Every admin page renders its own <Navbar/> directly (no shared
     layout route), so Navbar mounts/unmounts on every navigation.
     Removing the <style> tag on unmount meant every single page click
     produced a brief flash of unstyled nav while the next page's
     Navbar re-added it. Leaving one small <style> tag in <head> for
     the session costs nothing and removes that flicker.
     Longer-term: hoist <Navbar/> into a shared layout/route wrapper
     (e.g. an <Outlet/>-based AdminLayout) so it never unmounts on
     navigation at all — that's the real fix, this is the safe patch. */
  useEffect(() => {
    const id = "aml-navbar-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = NAV_STYLES;
      document.head.appendChild(el);
    }
  }, []);

  /* Close mobile menu + desktop dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setOpenDesktopGroup(null);
      }
    };
    if (menuOpen || openDesktopGroup) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, openDesktopGroup]);

  /* Close on Escape — basic keyboard accessibility for the dropdowns */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setOpenDesktopGroup(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Close everything on route change */
  useEffect(() => {
    setMenuOpen(false);
    setOpenDesktopGroup(null);
  }, [location.pathname]);

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
      return <div className="aml-user-role aml-user-role--superadmin">Super Admin</div>;
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

  const isGroupActive = (group) => group.items?.some(i => location.pathname === i.path);

  return (
    <div className="aml-nav-root" ref={menuRef}>
      <div className="aml-nav-stripe" />

      <div className="aml-nav-bar">

        {/* ── Left: Brand + desktop nav ── */}
        <div className="aml-nav-left">
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

          {isAdminOrAbove && (
            <>
              <div className="aml-brand-sep" />
              <nav className="aml-desktop-nav" aria-label="Admin navigation">
                {visibleGroups.map((group) => {
                  if (group.type === "link") {
                    const active = location.pathname === group.path;
                    return (
                      <Link
                        key={group.key}
                        to={group.path}
                        className={`aml-desktop-link${active ? " active" : ""}`}
                      >
                        {group.label}
                      </Link>
                    );
                  }

                  const isSuper = group.variant === "superadmin";
                  const active  = isGroupActive(group);
                  const open    = openDesktopGroup === group.key;

                  return (
                    <div key={group.key} className="aml-nav-group">
                      <button
                        type="button"
                        className={`aml-dropdown-trigger${isSuper ? " superadmin" : ""}${active ? " active" : ""}${open ? " open" : ""}`}
                        onClick={() => setOpenDesktopGroup(prev => prev === group.key ? null : group.key)}
                        aria-haspopup="true"
                        aria-expanded={open}
                      >
                        {group.label}
                        <span className="aml-dropdown-chevron" />
                      </button>

                      {open && (
                        <div
                          className={`aml-dropdown-panel${isSuper ? " superadmin" : ""}`}
                          style={group.align === "right" ? { left: "auto", right: 0 } : undefined}
                        >
                          {group.items.map((item) => {
                            const itemActive = location.pathname === item.path;
                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                className={`aml-dropdown-link${isSuper ? " superadmin" : ""}${itemActive ? " active" : ""}`}
                              >
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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

          {!isAdminOrAbove && (
            <button className="aml-signout" onClick={handleLogout}>Sign Out</button>
          )}

          {isAdminOrAbove && (
            <button className="aml-signout aml-signout-desktop" onClick={handleLogout}>
              Sign Out
            </button>
          )}

          {isAdminOrAbove && (
            <button
              className={`aml-burger${menuOpen ? " open" : ""}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className="aml-burger-line" style={{ transform: menuOpen ? "translateY(6px) rotate(45deg)" : "none" }} />
              <span className="aml-burger-line" style={{ opacity: menuOpen ? 0 : 1 }} />
              <span className="aml-burger-line" style={{ transform: menuOpen ? "translateY(-6px) rotate(-45deg)" : "none" }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile slide-down menu — grouped with section labels ── */}
      {isAdminOrAbove && (
        <div
          className="aml-mobile-menu"
          style={{
            maxHeight:     menuOpen ? "500px" : "0px",
            opacity:       menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? "auto" : "none",
          }}
          aria-hidden={!menuOpen}
        >
          <div className="aml-mobile-menu-inner">
            {visibleGroups.map((group) => {
              if (group.type === "link") {
                const active = location.pathname === group.path;
                return (
                  <Link key={group.key} to={group.path} className={`aml-mobile-link${active ? " active" : ""}`}>
                    {active && <span className="aml-mobile-active-bar" />}
                    {group.label}
                  </Link>
                );
              }

              const isSuper = group.variant === "superadmin";
              return (
                <div key={group.key}>
                  <div className={`aml-mobile-section-label${isSuper ? " superadmin" : ""}`}>
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`aml-mobile-link${isSuper ? " superadmin" : ""}${active ? " active" : ""}`}
                      >
                        {active && <span className={`aml-mobile-active-bar${isSuper ? " superadmin" : ""}`} />}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
            <div className="aml-mobile-sep" />
            <button className="aml-mobile-signout" onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      )}
    </div>
  );
}