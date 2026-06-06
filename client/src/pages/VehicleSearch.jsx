import { useState } from "react";
import api from "../api/axios";
import Navbar from "../components/Navbar";

/* ─────────────────────────────────────────────────────────────────
   Styles — AML Motors design language:
   IBM Plex Sans body, Barlow Condensed headings,
   #1E3A8A brand blue, #0A1628 dark, #6B7A99 muted, #DDE3EE borders.
   Angular/no-radius aesthetic. Gap-as-border grid trick.

   Mobile hardening applied:
   - autoFocus removed (keyboard flood on mount)
   - input font-size bumped to 16px at ≤520px (prevents iOS auto-zoom)
   - inputMode="search", autoCorrect="off", autoCapitalize="characters"
   - Search button min-height: 44px (Apple HIG touch target)
   - Placeholder shortened for narrow screens
   - Existing fixes: pagination race condition, hoursWorked null guard
───────────────────────────────────────────────────────────────── */
const VS_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

  .vs-page {
    min-height: 100vh;
    background: #EEF2F7;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .vs-container {
    max-width: 820px;
    margin: 0 auto;
    padding: 28px 16px 80px;
  }

  /* ── Header ── */
  .vs-header { margin-bottom: 22px; }
  .vs-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0A1628;
    line-height: 1;
    margin: 0 0 4px;
  }
  .vs-subtitle {
    font-size: 10px;
    color: #6B7A99;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
  }

  /* ── Search bar ── */
  .vs-search-wrap {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    display: flex;
    align-items: stretch;
    margin-bottom: 6px;
  }
  .vs-search-input {
    flex: 1;
    border: none;
    outline: none;
    padding: 13px 16px;
    font-size: 14px;
    font-family: 'IBM Plex Sans', sans-serif;
    color: #0A1628;
    background: transparent;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    min-width: 0;
    /* Prevent browsers from adding inner box-shadow on focus (iOS) */
    -webkit-appearance: none;
    appearance: none;
  }
  .vs-search-input::placeholder {
    text-transform: none;
    letter-spacing: 0;
    color: #A0AABB;
    font-size: 12.5px;
  }
  .vs-search-btn {
    background: #1E3A8A;
    border: none;
    color: #FFFFFF;
    padding: 0 22px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-family: 'IBM Plex Sans', sans-serif;
    cursor: pointer;
    flex-shrink: 0;
    /* min-height: 44px — Apple HIG minimum touch target.
       Ensures the button is always tappable on mobile even at
       smaller padding breakpoints. */
    min-height: 44px;
    transition: background 0.15s ease;
    -webkit-appearance: none;
    appearance: none;
    white-space: nowrap;
  }
  .vs-search-btn:hover:not(:disabled) { background: #163172; }
  .vs-search-btn:disabled             { background: #A0AABB; cursor: not-allowed; }

  .vs-search-hint {
    font-size: 10px;
    color: #6B7A99;
    letter-spacing: 0.06em;
    margin-bottom: 18px;
  }

  /* ── Error banner ── */
  .vs-error {
    background: #FEF2F2;
    border: 1px solid #FCA5A5;
    color: #DC2626;
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
  }

  /* ── Status bar ── */
  .vs-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 6px;
  }
  .vs-result-count {
    font-size: 11px;
    color: #6B7A99;
    font-weight: 500;
    letter-spacing: 0.06em;
  }
  .vs-result-count strong { color: #0A1628; font-weight: 600; }

  /* ── Loading skeletons ── */
  .vs-loading { display: flex; flex-direction: column; gap: 10px; }
  .vs-skeleton {
    height: 130px;
    background: linear-gradient(
      90deg,
      #E0E6F0 25%,
      #EEF2F7 50%,
      #E0E6F0 75%
    );
    background-size: 200% 100%;
    animation: vs-shimmer 1.3s infinite;
    border: 1px solid #DDE3EE;
  }
  @keyframes vs-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ── Empty / Initial states ── */
  .vs-empty, .vs-initial {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    padding: 44px 24px;
    text-align: center;
  }
  .vs-state-icon {
    width: 46px;
    height: 46px;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .vs-state-title {
    font-size: 13px;
    font-weight: 600;
    color: #0A1628;
    margin-bottom: 6px;
    letter-spacing: 0.02em;
  }
  .vs-state-sub {
    font-size: 11px;
    color: #6B7A99;
    line-height: 1.7;
    letter-spacing: 0.04em;
  }

  /* ── Result cards ── */
  .vs-results { display: flex; flex-direction: column; gap: 10px; }

  .vs-card {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    border-left: 3px solid #1E3A8A;
    overflow: hidden;
  }

  /* Card header — vehicle no + branch badge + service date */
  .vs-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 13px 16px 11px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .vs-vehicle-no {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #0A1628;
    text-transform: uppercase;
    line-height: 1;
  }
  .vs-card-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .vs-branch-badge {
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    color: #1E3A8A;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 3px 8px;
    white-space: nowrap;
  }
  .vs-date-badge {
    font-size: 10px;
    color: #6B7A99;
    font-weight: 500;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ── Technician row — stacked layout ──────────────────────────
     Line 1: Name  +  Employee ID (horizontal, tight)
     Line 2: Technician type badge
  ─────────────────────────────────────────────────────────────── */
  .vs-tech-row {
    padding: 10px 16px;
    background: #FAFBFD;
    border-top: 1px solid #EEF2F7;
    border-bottom: 1px solid #EEF2F7;
  }
  .vs-tech-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .vs-tech-top {
    display: flex;
    align-items: baseline;
    gap: 9px;
    flex-wrap: wrap;
  }
  .vs-tech-name {
    font-size: 13px;
    font-weight: 600;
    color: #0A1628;
    line-height: 1;
  }
  .vs-tech-id {
    font-size: 10px;
    color: #6B7A99;
    font-weight: 500;
    letter-spacing: 0.08em;
    font-family: 'IBM Plex Sans', monospace;
  }
  .vs-tech-type {
    display: inline-block;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7C3AED;
    background: #F5F3FF;
    border: 1px solid #DDD6FE;
    padding: 2px 8px;
    white-space: nowrap;
  }

  /* ── Details grid ──────────────────────────────────────────────
     Desktop 3-col, 5 cells:
       Row 1: Category | JC Number | Hours Worked
       Row 2: Labour Amount | Logged (span 2)
     Mobile ≤520px falls to 2-col:
       Row 1: Category | JC Number
       Row 2: Hours Worked | Labour Amount
       Row 3: Logged (span 2 = full width)
  ─────────────────────────────────────────────────────────────── */
  .vs-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: #EEF2F7;
  }
  .vs-detail-cell {
    background: #FFFFFF;
    padding: 10px 16px;
  }
  .vs-detail-cell--span2 {
    grid-column: span 2;
  }
  .vs-detail-label {
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: #6B7A99;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .vs-detail-value {
    font-size: 13px;
    font-weight: 600;
    color: #0A1628;
    line-height: 1.2;
  }
  .vs-detail-value.money { color: #16A34A; }
  .vs-detail-value.muted { color: #9BAABB; font-weight: 400; font-size: 12px; }
  .vs-detail-value.timestamp {
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    letter-spacing: 0.02em;
  }

  /* ── Pagination ── */
  .vs-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 18px;
  }
  .vs-pg-btn {
    background: #FFFFFF;
    border: 1px solid #DDE3EE;
    color: #1E3A8A;
    padding: 8px 16px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    /* 44px min-height for comfortable thumb tap */
    min-height: 44px;
    transition: border-color 0.15s ease, background 0.15s ease;
    -webkit-appearance: none;
    appearance: none;
  }
  .vs-pg-btn:hover:not(:disabled) { border-color: #1E3A8A; background: #EFF6FF; }
  .vs-pg-btn:disabled { color: #C0CADB; border-color: #EEF2F7; cursor: not-allowed; }
  .vs-pg-info {
    font-size: 10px;
    color: #6B7A99;
    font-weight: 600;
    letter-spacing: 0.1em;
    min-width: 60px;
    text-align: center;
  }

  /* ── Mobile ≤520px ─────────────────────────────────────────────
     Key fixes:
     1. font-size: 16px on input  → prevents iOS Safari auto-zoom
        (iOS zooms in when any focused input has font-size < 16px)
     2. min-height: 44px on button → already set globally above
     3. 2-col grid so cards don't get too cramped
     4. Logged cell still spans full width in 2-col (span 2 = 100%)
  ─────────────────────────────────────────────────────────────── */
  @media (max-width: 520px) {
    .vs-container       { padding: 20px 12px 80px; }
    .vs-title           { font-size: 20px; }

    /* CRITICAL: 16px prevents iOS auto-zoom on input focus */
    .vs-search-input    { font-size: 16px; letter-spacing: 0; }
    .vs-search-input::placeholder { font-size: 13px; }

    .vs-search-btn      { padding: 0 14px; font-size: 9px; }
    .vs-vehicle-no      { font-size: 18px; }

    .vs-details         { grid-template-columns: repeat(2, 1fr); }
    /* span 2 in a 2-col grid = full width — Logged takes the whole row */
    .vs-detail-cell--span2 { grid-column: span 2; }
  }

  @media (min-width: 640px) {
    .vs-container { padding: 32px 24px 80px; }
    .vs-title     { font-size: 24px; }
  }
`;

/* ─── Helpers ─────────────────────────────────────────────────── */

/** Service date: "3 Jun 2026" */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** Full datetime: "3 Jun 2026, 10:42 AM" */
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

/** Indian rupee format */
function fmtMoney(n) {
  if (n === undefined || n === null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}

/* ─── SVG search icon ─────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ─── Main Component ──────────────────────────────────────────── */
export default function VehicleSearch() {
  const [query,      setQuery]      = useState("");
  const [activeQ,    setActiveQ]    = useState("");
  const [results,    setResults]    = useState(null); // null = not yet searched
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  /* ── Core search ── */
  const doSearch = async (q, pg) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/search/vehicle", { params: { q, page: pg } });
      const d = res.data;
      setResults(d.results);
      setTotal(d.total);
      setPage(d.page);
      setTotalPages(d.totalPages);
      setActiveQ(q);
    } catch (err) {
      setError(err.response?.data?.message || "Search failed. Please try again.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  /* ── Handlers ── */
  const handleSearch = () => {
    const q = query.trim();
    if (q.length < 3) { setError("Enter at least 3 characters"); return; }
    doSearch(q, 1);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

  const handleInputChange = (e) => {
    setQuery(e.target.value.toUpperCase());
    if (error) setError("");
  };

  const handlePage = (newPage) => {
    doSearch(activeQ, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Render ── */
  return (
    <>
      <style>{VS_STYLES}</style>
      <Navbar />
      <div className="vs-page">
        <div className="vs-container">

          {/* Header */}
          <div className="vs-header">
            <h1 className="vs-title">Vehicle Search</h1>
            <div className="vs-subtitle">Cross-Branch Lookup · All Branches · Super Admin</div>
          </div>

          {/* Search bar */}
          <div className="vs-search-wrap">
            <input
              className="vs-search-input"
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}

              /*
               * Mobile keyboard behaviour:
               *
               * autoFocus — REMOVED intentionally.
               *   On mobile, autoFocus opens the keyboard the moment the page loads,
               *   pushing the header and search bar partially off-screen. Bad first
               *   impression. On desktop it's fine but we accept the trade-off.
               *
               * inputMode="search" — shows the Search/Go action button on
               *   the mobile keyboard instead of a newline key. Tapping it
               *   submits the search without needing to reach for the button.
               *
               * autoCapitalize="characters" — mobile keyboards default to
               *   caps lock mode. Vehicle numbers are all-caps so this saves
               *   the user from manually switching. We also uppercase in JS
               *   (onChange) as a safety net.
               *
               * autoCorrect="off" — disables autocorrect. Without this, iOS
               *   tries to "fix" KA01AB1234 into a word. Kills the lookup.
               *
               * spellCheck={false} — same reason. No red underlines on plate nos.
               */
              inputMode="search"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}

              /*
               * Placeholder — shortened vs original.
               * The search button eats ~80px of width on mobile,
               * so a long placeholder gets clipped mid-sentence.
               */
              placeholder="e.g. KA01AB1234 or last 4 digits"
              maxLength={20}
              disabled={loading}
            />
            <button
              className="vs-search-btn"
              onClick={handleSearch}
              disabled={loading || query.trim().length < 3}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
          <div className="vs-search-hint">
            Min 3 chars · Full plate or last-4-digits · Enter or tap Search
          </div>

          {/* Error */}
          {error && <div className="vs-error">{error}</div>}

          {/* Loading skeletons */}
          {loading && (
            <div className="vs-loading">
              {[0, 1, 2].map(i => <div key={i} className="vs-skeleton" />)}
            </div>
          )}

          {/* Results */}
          {!loading && results !== null && (
            <>
              <div className="vs-status-bar">
                <div className="vs-result-count">
                  {total === 0
                    ? <>No entries found for <strong>"{activeQ}"</strong></>
                    : <>
                        <strong>{total}</strong> {total === 1 ? "entry" : "entries"} for{" "}
                        <strong>"{activeQ}"</strong>
                        {totalPages > 1 && (
                          <> · Page <strong>{page}</strong> of <strong>{totalPages}</strong></>
                        )}
                      </>
                  }
                </div>
              </div>

              {results.length === 0 ? (
                <div className="vs-empty">
                  <div className="vs-state-icon"><SearchIcon /></div>
                  <div className="vs-state-title">No job cards found</div>
                  <div className="vs-state-sub">
                    No entries match <strong>"{activeQ}"</strong> across any branch.<br />
                    Try a different number or the last 4 digits of the plate.
                  </div>
                </div>
              ) : (
                <>
                  <div className="vs-results">
                    {results.map(entry => {
                      const tech = entry.userId;
                      return (
                        <div key={entry._id} className="vs-card">

                          {/* Vehicle no | branch badge | service date */}
                          <div className="vs-card-head">
                            <div className="vs-vehicle-no">
                              {entry.vehicleNo || "—"}
                            </div>
                            <div className="vs-card-badges">
                              <span className="vs-branch-badge">{entry.branch || "—"}</span>
                              <span className="vs-date-badge">{fmtDate(entry.date)}</span>
                            </div>
                          </div>

                          {/* Technician — name + id / type badge (stacked) */}
                          <div className="vs-tech-row">
                            <div className="vs-tech-info">
                              <div className="vs-tech-top">
                                <span className="vs-tech-name">{tech?.name || "—"}</span>
                                {tech?.technicianId && (
                                  <span className="vs-tech-id">{tech.technicianId}</span>
                                )}
                              </div>
                              {tech?.technicianType && (
                                <span className="vs-tech-type">{tech.technicianType}</span>
                              )}
                            </div>
                          </div>

                          {/* Detail grid — 3-col desktop / 2-col mobile
                              Row 1: Category | JC Number | Hours Worked
                              Row 2: Labour Amount | Logged (span 2)       */}
                          <div className="vs-details">

                            <div className="vs-detail-cell">
                              <div className="vs-detail-label">Category</div>
                              <div className="vs-detail-value">{entry.category || "—"}</div>
                            </div>

                            <div className="vs-detail-cell">
                              <div className="vs-detail-label">JC Number</div>
                              <div className="vs-detail-value">{entry.jcNo || "—"}</div>
                            </div>

                            <div className="vs-detail-cell">
                              <div className="vs-detail-label">Hours Worked</div>
                              <div className="vs-detail-value">
                                {/* FIX: != null catches both null and undefined
                                    prevents "— hrs" when hoursWorked is null in DB */}
                                {entry.hoursWorked ?? "—"}
                                {entry.hoursWorked != null && " hrs"}
                              </div>
                            </div>

                            <div className="vs-detail-cell">
                              <div className="vs-detail-label">Labour Amount</div>
                              <div className="vs-detail-value money">
                                {fmtMoney(entry.labourAmount)}
                              </div>
                            </div>

                            {/* Logged — spans 2 cols (full width on mobile, 2/3 on desktop) */}
                            <div className="vs-detail-cell vs-detail-cell--span2">
                              <div className="vs-detail-label">Logged</div>
                              <div className="vs-detail-value timestamp">
                                {fmtDateTime(entry.createdAt)}
                              </div>
                            </div>

                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination — FIX: disabled during loading (race condition guard) */}
                  {totalPages > 1 && (
                    <div className="vs-pagination">
                      <button
                        className="vs-pg-btn"
                        onClick={() => handlePage(page - 1)}
                        disabled={page <= 1 || loading}
                      >
                        ← Prev
                      </button>
                      <span className="vs-pg-info">{page} / {totalPages}</span>
                      <button
                        className="vs-pg-btn"
                        onClick={() => handlePage(page + 1)}
                        disabled={page >= totalPages || loading}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Initial state */}
          {!loading && results === null && !error && (
            <div className="vs-initial">
              <div className="vs-state-icon"><SearchIcon /></div>
              <div className="vs-state-title">Search any vehicle across all branches</div>
              <div className="vs-state-sub">
                Enter a full vehicle number or the last 4 digits of the plate.<br />
                Results show technician, job card, hours, labour amount,<br />
                and the exact time the entry was logged — sorted newest first.
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}