import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import { BRANCHES } from "../utils/constants";
import "./VehicleLogBoard.css";
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

function fmtJobDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  }).toUpperCase(); // → "15 JUN"
}
// ── NEW: combined date + time, e.g. "10 JUN, 09:18 AM" ────────────────────────
// Used everywhere a timestamp is shown, so logs/entries spanning multiple days
// are never ambiguous (previously only the time was shown, which was misleading
// once entries could legitimately be linked across days).
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }).toUpperCase();
  const timePart = fmtTime(iso);
  return `${datePart}, ${timePart}`;
}
// ── Duration formatting — deliberately coarse and cheap to compute ───────────
// Cap at 4 days: beyond that a number stops being meaningful (likely a stale
// log, not an active wait) so we just say "4d+" and stop.
const DURATION_CAP_DAYS = 4;

function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return "—";
  if (ms < 0) ms = 0;

  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days >= DURATION_CAP_DAYS) return `${DURATION_CAP_DAYS}d+`;
  return `${days}d`;
}
// ── Waiting-time severity — for UNASSIGNED vehicles only ──────────────────────
// A vehicle that's been logged but has no job card is the thing worth
// flagging; the longer it sits, the worse it looks.
function waitingLevel(ms) {
  const hours = ms / 3600000;
  if (hours <= 2)  return "good";  // 0-2 hr — fine
  if (hours <= 24) return "warn";  // 2-24 hr — keep an eye on it
  return "bad";                    // 1 day+ — flag it
}
function fmtMoney(n) {
  if (!n) return "₹0";
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
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
  const [logs,           setLogs]           = useState([]);
  const [total,          setTotal]          = useState(0);
  const [totalAssigned,  setTotalAssigned]  = useState(0); // across ALL pages
  const [totalUnassigned,setTotalUnassigned]= useState(0); // across ALL pages
  const [page,           setCurrPage]       = useState(1);
  const [totalPages,     setTotalPages]     = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");

  // ─── Stable ref for polling (avoids stale closures) ───────────────────────
const paramsRef  = useRef({ date, branch, q: committedQ, page: 1 });
const abortRef   = useRef(null); // ← NEW: cancels stale in-flight requests
  // ─── Core fetch ───────────────────────────────────────────────────────────
  // fetchBoard is stable (no deps). It always reads the current paramsRef.
const fetchBoard = useCallback(async (overrides = {}, silent = false) => {
  // Cancel any previous in-flight request. This prevents a slow response
  // from an old filter set from overwriting fresher data from the new one.
  if (abortRef.current) abortRef.current.abort();
  abortRef.current = new AbortController();

  const p = { ...paramsRef.current, ...overrides };
  paramsRef.current = p;

  if (!silent) setLoading(true);
  setError("");
  try {
    const qs = new URLSearchParams();
    qs.set("page", p.page);
    qs.set("date", p.date);
    if (p.branch)               qs.set("branch", p.branch);
    if (p.q && p.q.length >= 3) qs.set("q", p.q);

    const res = await api.get(`/api/security/board?${qs}`, {
      signal: abortRef.current.signal, // ← NEW: axios will throw on abort
    });
    setLogs(res.data.logs);
    setTotal(res.data.total);
    setTotalAssigned(res.data.totalAssigned   ?? 0);
    setTotalUnassigned(res.data.totalUnassigned ?? 0);
    setCurrPage(res.data.page);
    setTotalPages(res.data.totalPages);
  } catch (err) {
    // Aborted request — a newer one is already in flight. Silently ignore.
    if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
    console.error("[VehicleLogBoard] fetch error:", err);
    if (!silent) setError(err.response?.data?.message || "Failed to load vehicle log.");
  } finally {
    if (!silent) setLoading(false);
  }
}, []); // abortRef is a ref — stable, no deps needed
  // ── Fetch on filter change (resets to page 1) ──────────────────────────────
  useEffect(() => {
    fetchBoard({ date, branch, q: committedQ, page: 1 });
  }, [date, branch, committedQ, fetchBoard]);

  // ── Live polling (silent, current page) ───────────────────────────────────
// ── Live polling (silent, current page) ───────────────────────────────────
// Guard: skip the fetch when the tab is hidden (background tab, minimized).
// This directly cuts background load when any admin leaves this board open.
useEffect(() => {
  const id = setInterval(() => {
    if (document.visibilityState === "visible") fetchBoard({}, true);
  }, POLL_MS);
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

  const isToday     = date === todayStr();
  const dateDisplay = isToday ? "Today" : fmtDate(date + "T00:00:00");

  // Whether the summary counts span multiple pages (so we show the "all pages" sub-label)
  const isMultiPage = totalPages > 1;

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
            <span className={`vlb-summary-value${totalAssigned > 0 ? " vlb-summary-value--green" : ""}`}>
              {loading ? "…" : totalAssigned}
            </span>
            {isMultiPage && !loading && (
              <span className="vlb-summary-sub">all pages</span>
            )}
          </div>
          <div className="vlb-summary-cell">
            <span className="vlb-summary-label">Unassigned</span>
            <span className={`vlb-summary-value${totalUnassigned > 0 ? " vlb-summary-value--amber" : ""}`}>
              {loading ? "…" : totalUnassigned}
            </span>
            {isMultiPage && !loading && (
              <span className="vlb-summary-sub">all pages</span>
            )}
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

  const loggedAtMs = log.loggedAt ? new Date(log.loggedAt).getTime() : null;

  // ── Response time: gap between security log and the FIRST linked entry ─────
  let responseMs   = null;
  if (entries.length > 0 && loggedAtMs != null) {
    responseMs = new Date(entries[0].createdAt).getTime() - loggedAtMs;
  }

  // ── Waiting time: for unassigned vehicles, how long since they were logged ─
  let waitingMs = null;
  if (status === "unassigned" && loggedAtMs != null) {
    waitingMs = Date.now() - loggedAtMs;
  }

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
            {/* ── Date + time (was time-only before) ── */}
            <span className="vlb-log-time-badge">{fmtDateTime(log.loggedAt)}</span>
            {showBranch && log.branch && (
              <span className="vlb-branch-badge">{log.branch}</span>
            )}
            {/* ── Response time chip — always green: a response happened ── */}
            {responseMs != null && (
              <span className="vlb-meta-chip good">
                <span className="vlb-meta-chip-label">Response</span>
                {formatDuration(responseMs)}
              </span>
            )}
            {/* ── Waiting time chip — only for unassigned, severity-colored ── */}
            {waitingMs != null && (
              <span className={`vlb-meta-chip ${waitingLevel(waitingMs)}`}>
                <span className="vlb-meta-chip-label">Waiting</span>
                {formatDuration(waitingMs)}
              </span>
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
          {entries.map((entry, i) => {
            // Gap shown per entry:
            //  - 1st entry  → time from the security log itself (response time)
            //  - later entries → time since the PREVIOUS job card (handoff gap)
            const prevTime = i === 0 ? loggedAtMs : new Date(entries[i - 1].createdAt).getTime();
            const gapMs    = prevTime != null
              ? new Date(entry.createdAt).getTime() - prevTime
              : null;
            const gapLabel = i === 0 ? "since log" : "since prev. JC";

            return (
              <div key={entry._id} className="vlb-entry-row">
                <div>
                  <div className="vlb-entry-tech">{entry.userId?.name || "—"}</div>
                  {entry.userId?.technicianId && (
                    <div className="vlb-entry-tech-id">{entry.userId.technicianId}</div>
                  )}
                </div>
                <span className="vlb-entry-jc">{entry.jcNo}</span>
                <span className="vlb-entry-cat">{entry.category}</span>
                <div className="vlb-entry-time-wrap">       
<span className="vlb-entry-time">{fmtJobDate(entry.date)}</span>
                  {gapMs != null && (
                    <span className="vlb-entry-gap good">
                      +{formatDuration(gapMs)} {gapLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Unassigned indicator ── */}
      {status === "unassigned" && (
        <div className="vlb-unassigned-row">
          <div className="vlb-unassigned-left">
            <span className="vlb-unassigned-dot" />
            <span className="vlb-unassigned-text">
              No job card logged for this vehicle yet
            </span>
          </div>
        </div>
      )}

    </div>
  );
}