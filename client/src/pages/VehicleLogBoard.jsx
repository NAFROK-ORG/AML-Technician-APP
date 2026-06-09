import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import { BRANCHES } from "../utils/constants";

// ─── Constants ────────────────────────────────────────────────────────────────
const POLL_MS = 30_000; // 30-second live polling

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  }).toUpperCase();
}
function fmtMoney(n) {
  if (!n) return "₹0";
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

// ─── Injected styles ──────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes vlbFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes vlbPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  .vlb-page {
    min-height: 100dvh;
    background: #EEF2F7;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Page header ── */
  .vlb-page-header {
    padding: 24px 20px 20px;
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
  }
  .vlb-eyebrow {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #1E3A8A; margin-bottom: 6px;
  }
  .vlb-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 32px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.02em; text-transform: uppercase;
    line-height: 1; margin-bottom: 8px;
  }
  .vlb-subtitle {
    font-size: 11px; color: #6B7A99; font-weight: 400;
    display: flex; align-items: center; gap: 8px;
  }
  .vlb-poll-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #16A34A; flex-shrink: 0;
    animation: vlbPulse 2s ease-in-out infinite;
  }

  /* ── Content ── */
  .vlb-content {
    padding: 0 0 60px;
    max-width: 860px;
    margin: 0 auto;
  }

  /* ── Filter bar ── */
  .vlb-filters {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-top: none;
    padding: 14px 20px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .vlb-filter-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 120px; }
  .vlb-filter-label {
    font-size: 8px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #94A3B8;
  }
  .vlb-filter-input {
    height: 40px; padding: 0 10px;
    background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 0;
    color: #0A1628; font-size: 13px; font-weight: 600;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none; appearance: none; -webkit-appearance: none;
    box-sizing: border-box; width: 100%;
    transition: border-color 0.15s;
  }
  .vlb-filter-input:focus { border-color: #1E3A8A; outline: none; }
  .vlb-filter-input[type="date"] { color-scheme: light; }

  .vlb-search-wrap {
    display: flex; gap: 6px; flex: 2; min-width: 200px; align-items: flex-end;
  }
  .vlb-search-input {
    flex: 1;
    height: 40px; padding: 0 10px;
    background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 0;
    color: #0A1628; font-size: 13px; font-weight: 600;
    font-family: 'IBM Plex Mono', monospace;
    letter-spacing: 0.04em; text-transform: uppercase;
    outline: none; appearance: none; -webkit-appearance: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .vlb-search-input:focus { border-color: #1E3A8A; outline: none; }
  .vlb-search-input::placeholder { font-weight: 400; letter-spacing: 0.02em; text-transform: none; color: #CBD5E1; }
  .vlb-search-btn {
    height: 40px; padding: 0 14px;
    background: #1E3A8A; border: none; border-radius: 0;
    color: #FFFFFF; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; flex-shrink: 0;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .vlb-search-btn:hover { background: #1E40AF; }
  .vlb-clear-btn {
    height: 40px; padding: 0 12px;
    background: transparent; border: 1.5px solid #DDE3EE; border-radius: 0;
    color: #6B7A99; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; flex-shrink: 0;
    transition: border-color 0.15s, color 0.15s;
  }
  .vlb-clear-btn:hover { border-color: #94A3B8; color: #374151; }

  /* ── Summary strip ── */
  .vlb-summary {
    background: #F8FAFC;
    border: 1px solid #DDE3EE;
    border-top: none;
    display: flex;
    overflow: hidden;
  }
  .vlb-summary-cell {
    flex: 1; padding: 12px 20px;
    border-right: 1px solid #DDE3EE;
    display: flex; flex-direction: column; gap: 4px;
  }
  .vlb-summary-cell:last-child { border-right: none; }
  .vlb-summary-label {
    font-size: 8px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #94A3B8;
  }
  .vlb-summary-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 28px; font-weight: 700; color: #0A1628; line-height: 1;
  }
  .vlb-summary-value--green { color: #16A34A; }
  .vlb-summary-value--amber { color: #B45309; }

  /* ── Log cards ── */
  .vlb-logs-wrap {
    display: flex; flex-direction: column; gap: 1px;
    background: #DDE3EE;
    border: 1px solid #DDE3EE;
    border-top: none;
  }

  .vlb-log-card {
    background: #FFFFFF;
    animation: vlbFadeUp 0.22s ease both;
  }
  .vlb-log-card-header {
    padding: 14px 20px 12px;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    border-left: 4px solid #E2E8F0;
  }
  .vlb-log-card-header.assigned   { border-left-color: #16A34A; }
  .vlb-log-card-header.unassigned { border-left-color: #B45309; }

  .vlb-log-vehicle {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.06em; line-height: 1; margin-bottom: 3px;
  }
  .vlb-log-norm {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; font-weight: 600; color: #94A3B8;
    letter-spacing: 0.06em; margin-bottom: 5px;
  }
  .vlb-log-meta {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .vlb-log-by {
    font-size: 10px; font-weight: 600; color: #6B7A99;
    letter-spacing: 0.04em;
  }
  .vlb-log-time-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; font-weight: 600;
    color: #6B7A99; background: #F8FAFC;
    border: 1px solid #DDE3EE; padding: 2px 7px;
    letter-spacing: 0.04em;
  }
  .vlb-branch-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #1E3A8A;
    background: #EEF2F7; border: 1px solid #DDE3EE; padding: 2px 7px;
  }

  /* Status badges */
  .vlb-status {
    flex-shrink: 0;
    display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
  }
  .vlb-status-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; padding: 4px 10px;
    white-space: nowrap;
  }
  .vlb-status-badge.assigned {
    color: #16A34A; background: #F0FDF4; border: 1px solid #86EFAC;
  }
  .vlb-status-badge.unassigned {
    color: #B45309; background: #FFFBEB; border: 1px solid #FCD34D;
  }

  /* ── Entry list inside log card ── */
  .vlb-entries-wrap {
    border-top: 1px solid #F1F5F9;
    background: #F8FAFC;
  }
  .vlb-entry-row {
    padding: 10px 20px 10px 28px;
    border-bottom: 1px solid #F1F5F9;
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  }
  .vlb-entry-row:last-child { border-bottom: none; }
  .vlb-entry-tech {
    font-size: 11px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.02em; min-width: 100px;
  }
  .vlb-entry-tech-id {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; color: #1E3A8A; font-weight: 600;
    letter-spacing: 0.04em;
  }
  .vlb-entry-jc {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; font-weight: 600; color: #374151;
    letter-spacing: 0.04em; flex: 1; min-width: 80px;
  }
  .vlb-entry-cat {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #6B7A99;
    background: #F1F5F9; padding: 2px 6px;
    white-space: nowrap;
  }
  .vlb-entry-time {
    font-size: 10px; font-weight: 600; color: #94A3B8;
    font-family: 'IBM Plex Mono', monospace;
    white-space: nowrap;
  }

  /* ── Unassigned indicator ── */
  .vlb-unassigned-row {
    padding: 12px 20px 12px 28px;
    border-top: 1px solid #FEF3C7;
    background: #FFFBEB;
    display: flex; align-items: center; gap: 8px;
  }
  .vlb-unassigned-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #B45309; flex-shrink: 0;
    animation: vlbPulse 1.8s ease-in-out infinite;
  }
  .vlb-unassigned-text {
    font-size: 10px; font-weight: 600; color: #92400E;
    letter-spacing: 0.06em; text-transform: uppercase;
  }

  /* ── States ── */
  .vlb-empty {
    background: #FFFFFF; padding: 60px 20px; text-align: center;
    border-top: none;
  }
  .vlb-empty-icon { font-size: 28px; margin-bottom: 12px; }
  .vlb-empty-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 20px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px;
  }
  .vlb-empty-sub {
    font-size: 12px; color: #94A3B8; font-weight: 500;
  }
  .vlb-loading {
    background: #FFFFFF; padding: 60px 20px; text-align: center;
    font-size: 11px; font-weight: 600; color: #94A3B8;
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  .vlb-error-banner {
    background: #FEF2F2; border: 1px solid #DDE3EE; border-top: none;
    border-left: 4px solid #DC2626; padding: 14px 20px;
    font-size: 13px; font-weight: 600; color: #991B1B;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  /* ── Pagination ── */
  .vlb-pagination {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-top: 1px solid #EEF2F7;
    padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .vlb-page-info {
    font-size: 11px; font-weight: 600; color: #6B7A99;
    letter-spacing: 0.06em;
  }
  .vlb-page-info span { color: #0A1628; }
  .vlb-page-btns { display: flex; gap: 6px; }
  .vlb-page-btn {
    height: 36px; min-width: 36px; padding: 0 10px;
    background: transparent; border: 1.5px solid #DDE3EE; border-radius: 0;
    color: #374151; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 11px; font-weight: 700;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .vlb-page-btn:hover:not(:disabled) { border-color: #1E3A8A; color: #1E3A8A; }
  .vlb-page-btn:disabled { color: #CBD5E1; cursor: not-allowed; border-color: #EEF2F7; }
  .vlb-page-btn.active { background: #1E3A8A; color: #FFFFFF; border-color: #1E3A8A; }

  /* ── Animations ── */
  .vlb-a1 { animation: vlbFadeUp 0.28s ease both 0.00s; }
  .vlb-a2 { animation: vlbFadeUp 0.28s ease both 0.06s; }
  .vlb-a3 { animation: vlbFadeUp 0.28s ease both 0.10s; }

  @media (max-width: 600px) {
    .vlb-summary-cell { padding: 10px 14px; }
    .vlb-summary-value { font-size: 22px; }
    .vlb-filter-group { min-width: 100%; }
    .vlb-search-wrap  { min-width: 100%; }
  }
`;

// ─── Style injection ──────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const ID = "vlb-styles";
  if (!document.getElementById(ID)) {
    const el = document.createElement("style");
    el.id = ID;
    el.textContent = STYLES;
    document.head.appendChild(el);
  } else {
    document.getElementById(ID).textContent = STYLES;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VehicleLogBoard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";

  // ── Filters ────────────────────────────────────────────────────────────────
  const [date,       setDate]       = useState(todayStr());
  const [branch,     setBranch]     = useState(""); // "" = all (superadmin); ignored for branch admin
  const [searchQ,    setSearchQ]    = useState(""); // input value (live)
  const [committedQ, setCommittedQ] = useState(""); // committed on Enter/Search button

  // ── Data ───────────────────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setCurrPage]   = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  // ─── Stable ref for polling (avoids stale closures) ───────────────────────
  const paramsRef = useRef({ date, branch, q: committedQ, page: 1 });

  // ─── Core fetch ───────────────────────────────────────────────────────────
  // fetchBoard is stable (no deps). It always reads the current paramsRef.
  const fetchBoard = useCallback(async (overrides = {}, silent = false) => {
    const p = { ...paramsRef.current, ...overrides };
    paramsRef.current = p;

    if (!silent) setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("page", p.page);
      qs.set("date", p.date);
      if (p.branch)            qs.set("branch", p.branch);
      if (p.q && p.q.length >= 3) qs.set("q", p.q);

      const res = await api.get(`/api/security/board?${qs}`);
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setCurrPage(res.data.page);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("[VehicleLogBoard] fetch error:", err);
      if (!silent) setError(err.response?.data?.message || "Failed to load vehicle log.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── Fetch on filter change (resets to page 1) ──────────────────────────────
  useEffect(() => {
    fetchBoard({ date, branch, q: committedQ, page: 1 });
  }, [date, branch, committedQ, fetchBoard]);

  // ── Live polling (silent, current page) ───────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => fetchBoard({}, true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchBoard]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const handlePageChange = (newPage) => {
    fetchBoard({ page: newPage });
  };

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearch = () => {
    setCommittedQ(searchQ.trim());
  };
  const handleSearchKey = (e) => {
    if (e.key === "Enter") handleSearch();
  };
  const handleClearSearch = () => {
    setSearchQ("");
    setCommittedQ("");
  };

  // ── Derived page summary ───────────────────────────────────────────────────
  // Total = from API (all matching logs). Assigned/Unassigned = current page only.
  // At typical daily scale (< 100 logs), pages are rarely needed so
  // page-level counts are effectively the daily totals.
  const pageAssigned   = logs.filter((l) => l.status === "assigned").length;
  const pageUnassigned = logs.filter((l) => l.status === "unassigned").length;

  const isToday     = date === todayStr();
  const dateDisplay = isToday ? "Today" : fmtDate(date + "T00:00:00");

  return (
    <div className="vlb-page">
      <Navbar />

      {/* ── Page header ── */}
      <div className="vlb-page-header vlb-a1">
        <div className="vlb-eyebrow">Admin · Security Overview</div>
        <h1 className="vlb-title">Vehicle Log Board</h1>
        <div className="vlb-subtitle">
          <span className="vlb-poll-dot" />
          <span>Live · refreshes every 30 seconds</span>
        </div>
      </div>

      <div className="vlb-content">

        {/* ── Filters ── */}
        <div className="vlb-filters vlb-a2">

          {/* Date */}
          <div className="vlb-filter-group" style={{ flex: "0 0 auto", minWidth: "140px" }}>
            <span className="vlb-filter-label">Date</span>
            <input
              type="date"
              className="vlb-filter-input"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Branch — superadmin only */}
          {isSuperAdmin && (
            <div className="vlb-filter-group" style={{ flex: "0 0 auto", minWidth: "140px" }}>
              <span className="vlb-filter-label">Branch</span>
              <select
                className="vlb-filter-input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%231E3A8A' d='M7 9.5L2 4.5h10z'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  paddingRight: "30px",
                  cursor: "pointer",
                }}
              >
                <option value="">All Branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicle search */}
          <div className="vlb-filter-group">
            <span className="vlb-filter-label">Search Vehicle</span>
            <div className="vlb-search-wrap">
              <input
                type="text"
                className="vlb-search-input"
                placeholder="KA01AB… (min 3 chars)"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value.toUpperCase())}
                onKeyDown={handleSearchKey}
                maxLength={20}
                autoComplete="off"
              />
              <button className="vlb-search-btn" onClick={handleSearch}>
                Search
              </button>
              {committedQ && (
                <button className="vlb-clear-btn" onClick={handleClearSearch}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Summary strip ── */}
        <div className="vlb-summary vlb-a2">
          <div className="vlb-summary-cell">
            <span className="vlb-summary-label">Total Logged</span>
            <span className="vlb-summary-value">{loading ? "…" : total}</span>
          </div>
          <div className="vlb-summary-cell">
            <span className="vlb-summary-label">Assigned</span>
            <span className={`vlb-summary-value${pageAssigned > 0 ? " vlb-summary-value--green" : ""}`}>
              {loading ? "…" : pageAssigned}
            </span>
          </div>
          <div className="vlb-summary-cell">
            <span className="vlb-summary-label">Unassigned</span>
            <span className={`vlb-summary-value${pageUnassigned > 0 ? " vlb-summary-value--amber" : ""}`}>
              {loading ? "…" : pageUnassigned}
            </span>
          </div>
          <div className="vlb-summary-cell">
            <span className="vlb-summary-label">Viewing</span>
            <span className="vlb-summary-value" style={{ fontSize: "14px", paddingTop: "6px", color: "#6B7A99" }}>
              {dateDisplay}
              {!isSuperAdmin && user?.branch ? ` · ${user.branch}` : ""}
              {isSuperAdmin && branch ? ` · ${branch}` : ""}
            </span>
          </div>
        </div>

        {/* ── Main log list ── */}
        {error ? (
          <div className="vlb-error-banner vlb-a3">{error}</div>
        ) : loading ? (
          <div className="vlb-loading vlb-a3">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="vlb-empty vlb-a3">
            <div className="vlb-empty-icon">🚗</div>
            <div className="vlb-empty-title">No Logs Found</div>
            <p className="vlb-empty-sub">
              {committedQ
                ? `No vehicles matching "${committedQ}" logged on ${dateDisplay}`
                : `No vehicles logged ${dateDisplay.toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="vlb-logs-wrap vlb-a3">
            {logs.map((log) => (
              <LogCard key={log._id} log={log} showBranch={isSuperAdmin && !branch} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && !error && totalPages > 1 && (
          <div className="vlb-pagination">
            <span className="vlb-page-info">
              Page <span>{page}</span> of <span>{totalPages}</span>
              {" · "}
              <span>{total}</span> logs
            </span>
            <div className="vlb-page-btns">
              <button
                className="vlb-page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                ‹ Prev
              </button>
              <button
                className="vlb-page-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next ›
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Log card component ───────────────────────────────────────────────────────
function LogCard({ log, showBranch }) {
  const { status, entries = [] } = log;

  return (
    <div className="vlb-log-card">

      {/* ── Card header ── */}
      <div className={`vlb-log-card-header ${status}`}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vlb-log-vehicle">{log.vehicleNo}</div>
          <div className="vlb-log-norm">→ {log.vehicleNoNorm}</div>
          <div className="vlb-log-meta">
            <span className="vlb-log-by">
              {log.loggedBy?.name || "Security"}
            </span>
            <span className="vlb-log-time-badge">{fmtTime(log.loggedAt)}</span>
            {showBranch && log.branch && (
              <span className="vlb-branch-badge">{log.branch}</span>
            )}
          </div>
        </div>
        <div className="vlb-status">
          <span className={`vlb-status-badge ${status}`}>
            {status === "assigned" ? "✓ Assigned" : "Unassigned"}
          </span>
          {entries.length > 0 && (
            <span style={{
              fontSize: "9px", fontWeight: "600", color: "#94A3B8",
              letterSpacing: "0.04em",
            }}>
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>
      </div>

      {/* ── Linked entries ── */}
      {entries.length > 0 && (
        <div className="vlb-entries-wrap">
          {entries.map((entry) => (
            <div key={entry._id} className="vlb-entry-row">
              <div>
                <div className="vlb-entry-tech">{entry.userId?.name || "—"}</div>
                {entry.userId?.technicianId && (
                  <div className="vlb-entry-tech-id">{entry.userId.technicianId}</div>
                )}
              </div>
              <span className="vlb-entry-jc">{entry.jcNo}</span>
              <span className="vlb-entry-cat">{entry.category}</span>
              <span className="vlb-entry-time">{fmtTime(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Unassigned indicator ── */}
      {status === "unassigned" && (
        <div className="vlb-unassigned-row">
          <span className="vlb-unassigned-dot" />
          <span className="vlb-unassigned-text">
            No job card logged for this vehicle yet
          </span>
        </div>
      )}

    </div>
  );
}