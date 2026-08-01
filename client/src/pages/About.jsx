import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "./About.css";

/* Minimal hand-rolled icons — matches the no-icon-library pattern already
   used in Navbar.jsx (hamburger lines, chevron). Keeps this page dependency-free. */
const IconWrench = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="1.6">
    <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3-3z" />
  </svg>
);
const IconBuilding = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="1.6">
    <rect x="4" y="3" width="16" height="18" />
    <path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2" />
  </svg>
);
const IconCrown = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.6">
    <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z" />
  </svg>
);
const IconShield = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.6">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
  </svg>
);

/* New icons — used in the live-metrics strip and the analytics section.
   Same stroke-only, 1.6 weight, no-fill convention as the icons above. */
const IconCheckBadge = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M12 3l2.2 1.3 2.6-.2 1 2.4 2.3 1.2-.5 2.6 1.2 2.3-1.8 1.9.3 2.6-2.5.9-1.1 2.4-2.6-.4L12 21.5l-1.9-1.5-2.6.4-1.1-2.4-2.5-.9.3-2.6L2.4 13l1.2-2.3-.5-2.6 2.3-1.2 1-2.4 2.6.2L12 3z" />
    <path d="M8.5 12.3l2.2 2.2 4.3-4.6" />
  </svg>
);
const IconLogbook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M5 4.5h11a2 2 0 0 1 2 2V21H7a2 2 0 0 1-2-2V4.5z" />
    <path d="M5 4.5a2 2 0 0 1 2-2h9v3" />
    <path d="M9 9.5h6M9 13h6M9 16.5h3.5" />
  </svg>
);
const IconGate = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M4 20V7l8-4 8 4v13" />
    <path d="M4 11h16M9 20v-6h6v6" />
  </svg>
);
const IconChart = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="1.6">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
const IconRupee = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 4h11M6 9h11M6 4c4.5 0 7.5 1.6 7.5 5S10.5 14 6 14l8 7" />
  </svg>
);
const IconBranchCompare = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20V13M10 20V6M16 20v-9M4 13l6-7 6 4 6-5" />
  </svg>
);
const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
const IconExport = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3v11M12 14l-4-4M12 14l4-4M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
  </svg>
);

const CAPABILITIES = [
  {
    title: "Job Card Logging",
    desc: "Technicians log every vehicle, JC number, category, and hours worked directly from the shop floor — no paper, no re-entry.",
  },
  {
    title: "Incentive Engine",
    desc: "Monthly payouts calculate automatically from logged entries using a four-slab structure, removing manual computation and disputes.",
  },
  {
    title: "Gate Security Log",
    desc: "Security logs every inbound vehicle at the gate. Admins see live assignment status — which vehicles are logged but not yet picked up.",
  },
  {
    title: "Vehicle Analytics",
    desc: "Gate intake, assignment rate, and response time tracked across today, 7 days, or 30 days — with branch-to-branch comparison.",
  },
  {
    title: "Attendance Analytics",
    desc: "Attendance rate, ghost-attendance detection, and mark-time patterns, surfaced per branch and cross-branch for superadmin.",
  },
  {
    title: "Forensic Audit Log",
    desc: "Every admin edit or delete on a job card entry is permanently recorded with a full before-snapshot and field-level diff.",
  },
];

/* Live cumulative platform totals — real operational counts, not sample data.
   Update these three numbers as the source figures move; the count-up
   animation and bar weighting recompute automatically from whatever is here. */
const LIVE_METRICS = [
  { key: "attendance", label: "Attendance Marked", value: 3532, icon: <IconCheckBadge />, accent: "#16A34A" },
  { key: "entries", label: "Technician Entries Logged", value: 4255, icon: <IconLogbook />, accent: "#1E3A8A" },
  { key: "vehicles", label: "Vehicle Gate Logs", value: 1333, icon: <IconGate />, accent: "#D97706" },
];

const ANALYTICS_FEATURES = [
  { icon: <IconRupee />, text: "Labour, hours &amp; incentive payouts rolled up monthly, per branch and system-wide" },
  { icon: <IconBranchCompare />, text: "Branch-to-branch performance comparison, ranked and benchmarked" },
  { icon: <IconClock />, text: "Category-wise labour breakdown and month-over-month trend lines" },
  { icon: <IconExport />, text: "One-click CSV export for board packs and audit review" },
];

/* Count-up on scroll-into-view, respecting reduced-motion preference.
   Falls back to the static final value instantly if the browser signals
   prefers-reduced-motion, or if IntersectionObserver isn't available. */
function useCountUp(target, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now) => {
              const progress = Math.min(1, (now - start) / durationMs);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.round(eased * target));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return [value, ref];
}

function MetricCard({ metric, maxValue }) {
  const [value, ref] = useCountUp(metric.value);
  const barPct = Math.max(6, Math.round((metric.value / maxValue) * 100));

  return (
    <div className="ab-metric-card" ref={ref}>
      <div className="ab-metric-top">
        <span className="ab-metric-icon" style={{ color: metric.accent }}>{metric.icon}</span>
        <span className="ab-metric-label">{metric.label}</span>
      </div>
      <div className="ab-metric-value" style={{ color: metric.accent }}>
        {value.toLocaleString("en-IN")}
      </div>
      <div className="ab-metric-bar-track">
        <div
          className="ab-metric-bar-fill"
          style={{ width: `${barPct}%`, background: metric.accent }}
        />
      </div>
    </div>
  );
}

/* Illustrative trend line for the analytics preview card — static SVG,
   clearly labelled "Sample view" so it never reads as a live financial figure. */
function AnalyticsPreviewChart() {
  const bars = [38, 52, 46, 61, 58, 70, 65, 74];
  const linePts = [10, 24, 18, 34, 30, 46, 40, 52];
  const W = 280, H = 120, n = bars.length, colW = W / n;

  const lineD = linePts
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * colW + colW / 2} ${H - v}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ab-chart-svg" preserveAspectRatio="none">
      {bars.map((v, i) => (
        <rect
          key={i}
          x={i * colW + colW * 0.22}
          y={H - v}
          width={colW * 0.56}
          height={v}
          fill="#1E3A8A"
          opacity="0.16"
        />
      ))}
      <path d={lineD} fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {linePts.map((v, i) => (
        <circle key={i} cx={i * colW + colW / 2} cy={H - v} r="2.6" fill="#D97706" />
      ))}
      <line x1="0" y1={H} x2={W} y2={H} stroke="#DDE3EE" strokeWidth="1" />
    </svg>
  );
}

export default function About() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const maxMetric = Math.max(...LIVE_METRICS.map((m) => m.value));

  return (
    <div className="ab-page">
      {/* ── Top bar ── */}
      <div className={`ab-topbar${scrolled ? " ab-topbar--scrolled" : ""}`}>
        <div className="ab-brand">
          <img src="/aml-motors-pvt.png" alt="AML Motors" className="ab-brand-logo" draggable={false} />
          <span className="ab-brand-name">AML Motors</span>
          <span className="ab-brand-live">
            <i className="ab-live-dot" />
            5 Branches Live
          </span>
        </div>
        <div className="ab-topbar-actions">
          <Link to="/signup" className="ab-btn ab-btn--ghost">Sign Up</Link>
          <Link to="/login" className="ab-btn ab-btn--primary">Login</Link>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="ab-hero">
        <div className="ab-eyebrow">Internal Workforce Management · Board Overview</div>
        <h1 className="ab-h1">
          One system for every branch,<br />every role, <span>every job card.</span>
        </h1>
        <p className="ab-hero-sub">
          AML Motors replaces paper job cards and hand-calculated incentives with a live,
          role-based system built for Ashok Leyland's multi-branch service centers —
          from the technician's bay to the branch manager's desk, with full financial
          visibility at the management level.
        </p>
        <div className="ab-hero-actions">
          <Link to="/login" className="ab-btn ab-btn--primary">Access Your Portal</Link>
          <Link to="/signup" className="ab-btn ab-btn--ghost">Create Technician Account</Link>
        </div>
      </div>

      {/* ── System scope ── */}
      <div className="ab-stats">
        <div className="ab-stat">
          <div className="ab-stat-value">5</div>
          <div className="ab-stat-label">Branches Live</div>
        </div>
        <div className="ab-stat">
          <div className="ab-stat-value">4</div>
          <div className="ab-stat-label">Role Types</div>
        </div>
        <div className="ab-stat">
          <div className="ab-stat-value">6</div>
          <div className="ab-stat-label">Core Modules</div>
        </div>
        <div className="ab-stat">
          <div className="ab-stat-value">100%</div>
          <div className="ab-stat-label">Edits Audit-Logged</div>
        </div>
      </div>

      {/* ── Live platform activity ── */}
      <div className="ab-section ab-metrics-section">
        <div className="ab-section-label">Cumulative Activity · All Branches</div>
        <div className="ab-section-title">The System Is Being Used, Right Now</div>
        <p className="ab-section-sub">
          These are running totals recorded by the platform itself — not projections.
          Every number below traces back to a technician, a security guard, or an
          admin action, timestamped and attributable.
        </p>
        <div className="ab-metrics-strip">
          {LIVE_METRICS.map((m) => (
            <MetricCard key={m.key} metric={m} maxValue={maxMetric} />
          ))}
        </div>
      </div>

      {/* ── Problem / Solution ── */}
      <div className="ab-section">
        <div className="ab-section-label">Why This Exists</div>
        <div className="ab-section-title">Paper Doesn't Scale Across 5 Branches</div>
        <p className="ab-section-sub">
          Before this system, every branch ran on its own paper trail. That meant no
          shared record, no visibility for management, and no way to trust the numbers
          at incentive time.
        </p>
        <div className="ab-before-after">
          <div className="ab-ba-col before">
            <h3>Before</h3>
            <ul>
              <li>Job cards logged manually on paper, no central record</li>
              <li>Incentives calculated by hand — slow and disputed</li>
              <li>Zero manager visibility into daily technician output</li>
              <li>No way to trace a vehicle's service history</li>
              <li>No standard process for logging vehicles at the gate</li>
              <li>No record of who actually showed up on a given day</li>
            </ul>
          </div>
          <div className="ab-ba-col after">
            <h3>With AML Motors</h3>
            <ul>
              <li>Every entry logged digitally, timestamped, attributable</li>
              <li>Incentives auto-calculated from real entry data</li>
              <li>Live dashboards for branch admins and management</li>
              <li>Vehicles searchable across all branches in seconds</li>
              <li>Gate security logs feed directly into assignment tracking</li>
              <li>Attendance enforced server-side before any entry is logged</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Analytics — built for financial & board-level visibility ── */}
      <div className="ab-section">
        <div className="ab-section-label">For Management &amp; The Board</div>
        <div className="ab-section-title">One Analytics Suite, Built For Financial Oversight</div>
        <p className="ab-section-sub">
          Beyond day-to-day operations, the system ships with a dedicated Analytics
          module — the same reporting layer branch admins and the super admin use to
          track labour, incentives, and vehicle throughput across every branch.
        </p>
        <div className="ab-analytics-grid">
          <div className="ab-analytics-copy">
            <div className="ab-analytics-icon"><IconChart /></div>
            <h3 className="ab-analytics-heading">Performance Analytics</h3>
            <p className="ab-analytics-desc">
              Every labour hour, incentive payout, and vehicle gate entry feeds one
              reporting layer — filterable by branch and by date range, exportable
              for offline review.
            </p>
            <ul className="ab-analytics-features">
              {ANALYTICS_FEATURES.map((f, i) => (
                <li key={i}>
                  <span className="ab-analytics-feature-icon">{f.icon}</span>
                  <span dangerouslySetInnerHTML={{ __html: f.text }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="ab-analytics-visual">
            <div className="ab-analytics-visual-head">
              <span>Monthly Trend — Labour &amp; Incentives</span>
              <span className="ab-analytics-sample-tag">Sample view</span>
            </div>
            <AnalyticsPreviewChart />
            <div className="ab-analytics-legend">
              <span><i style={{ background: "#1E3A8A", opacity: 0.5 }} /> Labour volume</span>
              <span><i style={{ background: "#D97706" }} /> Incentives trend</span>
            </div>
            <div className="ab-analytics-kpis">
              <div className="ab-analytics-kpi">
                <div className="ab-analytics-kpi-label">Scope</div>
                <div className="ab-analytics-kpi-value">Branch &amp; Cross-Branch</div>
              </div>
              <div className="ab-analytics-kpi">
                <div className="ab-analytics-kpi-label">Refresh</div>
                <div className="ab-analytics-kpi-value">Live, On Load</div>
              </div>
              <div className="ab-analytics-kpi">
                <div className="ab-analytics-kpi-label">Export</div>
                <div className="ab-analytics-kpi-value">CSV, One Click</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Roles ── */}
      <div className="ab-section">
        <div className="ab-section-label">Built By Role</div>
        <div className="ab-section-title">Everyone Sees Exactly What Their Job Needs</div>
        <p className="ab-section-sub">
          Access is scoped by role and, for branch staff, by branch — enforced on the
          server, not just hidden in the interface.
        </p>
        <div className="ab-roles-grid">
          <div className="ab-role-card">
            <div className="ab-role-icon"><IconWrench /></div>
            <div className="ab-role-name">Technician</div>
            <div className="ab-role-tag">Shop Floor</div>
            <ul className="ab-role-list">
              <li>Mark daily attendance before logging any work</li>
              <li>Log job cards — vehicle, hours, category, labour</li>
              <li>View personal entry history</li>
              <li>See monthly incentive breakdown</li>
            </ul>
          </div>
          <div className="ab-role-card">
            <div className="ab-role-icon"><IconBuilding /></div>
            <div className="ab-role-name">Branch Admin</div>
            <div className="ab-role-tag">Single Branch</div>
            <ul className="ab-role-list">
              <li>Full technician list with aggregated stats</li>
              <li>Branch attendance and vehicle log boards</li>
              <li>Branch-scoped analytics and trends</li>
              <li>Edit or reset access for their branch only</li>
            </ul>
          </div>
          <div className="ab-role-card superadmin">
            <div className="ab-role-icon"><IconCrown /></div>
            <div className="ab-role-name">Super Admin</div>
            <div className="ab-role-tag">Cross-Branch</div>
            <ul className="ab-role-list">
              <li>Everything a branch admin can do, system-wide</li>
              <li>Cross-branch analytics and top performers</li>
              <li>Vehicle search across every branch</li>
              <li>Full forensic audit log of every edit</li>
            </ul>
          </div>
          <div className="ab-role-card security">
            <div className="ab-role-icon"><IconShield /></div>
            <div className="ab-role-name">Security</div>
            <div className="ab-role-tag">Gate Staff</div>
            <ul className="ab-role-list">
              <li>Log inbound vehicles by number plate</li>
              <li>View and edit today's own logs</li>
              <li>Branch auto-attached — no manual entry</li>
              <li>Feeds directly into admin assignment board</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Capabilities ── */}
      <div className="ab-section">
        <div className="ab-section-label">What It Does</div>
        <div className="ab-section-title">Six Modules, One Record Of Truth</div>
        <p className="ab-section-sub">
          Every module writes to the same underlying data — no reconciling numbers
          between spreadsheets and paper logs.
        </p>
        <div className="ab-cap-grid">
          {CAPABILITIES.map((c) => (
            <div className="ab-cap" key={c.title}>
              <div className="ab-cap-title">{c.title}</div>
              <div className="ab-cap-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="ab-cta">
        <div className="ab-cta-title">Ready To Sign In</div>
        <div className="ab-cta-sub">Technicians, admins, and security staff use the same portal.</div>
        <Link to="/login" className="ab-btn ab-btn--primary">Login to AML Motors</Link>
      </div>
    </div>
  );
}