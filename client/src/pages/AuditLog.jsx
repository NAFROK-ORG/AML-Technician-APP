import { useState, useEffect, useCallback, memo } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

// ─── Styles ────────────────────────────────────────────────────────────────
const AL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  .al-page { min-height: 100dvh; background: #EEF2F7; font-family: 'IBM Plex Sans', sans-serif; }

  .al-header { padding: 24px 20px 20px; background: #FFFFFF; border-bottom: 1px solid #DDE3EE; }
  .al-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #1E3A8A; margin-bottom: 6px; }
  .al-title { font-family: 'Barlow Condensed', sans-serif; font-size: 32px; font-weight: 700; color: #0A1628; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1; margin-bottom: 8px; }
  .al-sub { font-size: 11px; color: #6B7A99; font-weight: 500; }

  .al-toolbar { max-width: 800px; margin: 16px auto 0; padding: 0 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
  .al-filters { display: flex; gap: 8px; flex-wrap: wrap; }

  .al-select {
    height: 38px; padding: 0 12px; background: #FFFFFF; border: 1.5px solid #DDE3EE;
    color: #374151; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; cursor: pointer; appearance: none;
  }

  .al-flush-btn {
    height: 38px; padding: 0 16px; background: #FEF2F2; border: 1.5px solid #FCA5A5;
    color: #DC2626; font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: background 0.15s, border-color 0.15s;
  }
  .al-flush-btn:hover:not(:disabled) { background: #FEE2E2; border-color: #DC2626; }
  .al-flush-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .al-list { max-width: 800px; margin: 16px auto 60px; padding: 0 16px; display: flex; flex-direction: column; gap: 1px; }

  .al-card { background: #FFFFFF; border: 1px solid #DDE3EE; border-left: 4px solid #CBD5E1; padding: 16px 18px; }
  .al-card.delete { border-left-color: #DC2626; }
  .al-card.edit   { border-left-color: #1E3A8A; }

  .al-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .al-action-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 3px 8px; border: 1px solid; }
  .al-action-badge.delete { color: #DC2626; border-color: #FCA5A5; background: #FEF2F2; }
  .al-action-badge.edit   { color: #1E3A8A; border-color: #BFDBFE; background: #EFF6FF; }
  .al-timestamp { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #94A3B8; white-space: nowrap; }

  .al-row { font-size: 11px; color: #374151; margin-bottom: 4px; }
  .al-row b { color: #0A1628; font-weight: 700; }
  .al-mono { font-family: 'IBM Plex Mono', monospace; font-size: 11px; }

  .al-changes { margin-top: 10px; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; }
  .al-change-row { display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; }
  .al-change-field { color: #6B7A99; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .al-change-vals { font-family: 'IBM Plex Mono', monospace; color: #0A1628; }
  .al-change-vals .from { color: #DC2626; text-decoration: line-through; margin-right: 6px; }
  .al-change-vals .to   { color: #16A34A; }

  .al-snapshot-toggle { margin-top: 8px; font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #1E3A8A; cursor: pointer; background: none; border: none; padding: 0; }
  .al-snapshot { margin-top: 8px; padding: 10px 12px; background: #0A1628; color: #94A3B8; font-family: 'IBM Plex Mono', monospace; font-size: 10px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }

  .al-empty, .al-loading { text-align: center; padding: 60px 20px; color: #94A3B8; font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; }

  .al-pagination { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 0; }
  .al-page-btn { height: 36px; padding: 0 16px; background: #FFFFFF; border: 1.5px solid #DDE3EE; color: #374151; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; border-radius: 0; }
  .al-page-btn:disabled { color: #CBD5E1; cursor: not-allowed; }
  .al-page-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; color: #0A1628; }

  .al-denied { text-align: center; padding: 80px 20px; }
  .al-denied-title { font-family: 'Barlow Condensed', sans-serif; font-size: 24px; font-weight: 700; color: #0A1628; text-transform: uppercase; margin-bottom: 8px; }
  .al-denied-text { font-size: 12px; color: #94A3B8; }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

// ─── Single log card ──────────────────────────────────────────────────────
const LogCard = memo(function LogCard({ log }) {
  const [showSnapshot, setShowSnapshot] = useState(false);
  const isDelete = log.action === "DELETE_ENTRY";

  return (
    <div className={`al-card ${isDelete ? "delete" : "edit"}`}>
      <div className="al-card-top">
        <span className={`al-action-badge ${isDelete ? "delete" : "edit"}`}>
          {isDelete ? "Deleted" : "Edited"}
        </span>
        <span className="al-timestamp">{fmtDateTime(log.createdAt)}</span>
      </div>

      <div className="al-row">
        <b>{log.performedByName}</b> ({log.performedByRole}, {log.performedByBranch || "—"})
        {" "}{isDelete ? "deleted" : "edited"} an entry belonging to{" "}
        <b>{log.targetUserName}</b>
        {log.targetTechnicianId && (
          <span className="al-mono"> [{log.targetTechnicianId}]</span>
        )}
        {" "}— branch <b>{log.targetBranch}</b>
      </div>

      <div className="al-row al-mono" style={{ color: "#94A3B8" }}>
        Entry ID: {log.entryId}
        {log.ipAddress && <> · IP: {log.ipAddress}</>}
      </div>

      {!isDelete && log.changes && Object.keys(log.changes).length > 0 && (
        <div className="al-changes">
          {Object.entries(log.changes).map(([field, { from, to }]) => (
            <div className="al-change-row" key={field}>
              <span className="al-change-field">{field}</span>
              <span className="al-change-vals">
                <span className="from">{String(from)}</span>
                <span className="to">{String(to)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <button className="al-snapshot-toggle" onClick={() => setShowSnapshot((s) => !s)}>
        {showSnapshot ? "Hide" : "View"} full entry snapshot (pre-{isDelete ? "delete" : "edit"})
      </button>
      {showSnapshot && (
        <pre className="al-snapshot">{JSON.stringify(log.entrySnapshot, null, 2)}</pre>
      )}
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────
export default function AuditLog() {
  const { user } = useAuthStore();
  const [logs,         setLogs]         = useState([]);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [flushing,     setFlushing]     = useState(false);

  // ── Style injection — inside useEffect so it runs per mount/unmount
  //    and never collides with other pages using their own style tags ──
  useEffect(() => {
    const id = "al-styles-audit-log";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = AL_STYLES;
      document.head.appendChild(el);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (actionFilter) params.set("action", actionFilter);

      const res = await api.get(`/api/audit?${params.toString()}`);
      setLogs(res.data.logs   || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error("Audit log fetch error:", err);
      setError(err.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [actionFilter]);

  const handleFlush = async () => {
    const confirmed = window.confirm(
      "This will PERMANENTLY delete ALL audit log records. " +
      "This cannot be undone. Are you sure you want to flush all logs?"
    );
    if (!confirmed) return;

    setFlushing(true);
    try {
      await api.delete("/api/audit/flush");
      setLogs([]);
      setTotal(0);
      setPages(1);
      setPage(1);
    } catch (err) {
      alert(err.response?.data?.message || "Flush failed");
    } finally {
      setFlushing(false);
    }
  };

  // ── Frontend gate: superadmin only ──
  if (user && user.role !== "superadmin") {
    return (
      <div className="al-page">
        <Navbar />
        <div className="al-denied">
          <div className="al-denied-title">Access Restricted</div>
          <p className="al-denied-text">The audit log is visible to superadmins only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="al-page">
      <Navbar />

      <div className="al-header">
        <div className="al-eyebrow">Superadmin · System Audit</div>
        <h1 className="al-title">Audit Log</h1>
        <p className="al-sub">
          Every edit and delete on job card entries, across all branches —{" "}
          {total} record{total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="al-toolbar">
        <div className="al-filters">
          <select
            className="al-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="DELETE_ENTRY">Deletes Only</option>
            <option value="EDIT_ENTRY">Edits Only</option>
          </select>
        </div>

        <button
          className="al-flush-btn"
          onClick={handleFlush}
          disabled={flushing || total === 0}
        >
          {flushing ? "Flushing…" : "Flush All Logs"}
        </button>
      </div>

      {loading ? (
        <div className="al-loading">Loading…</div>
      ) : error ? (
        <div className="al-empty" style={{ color: "#DC2626" }}>{error}</div>
      ) : logs.length === 0 ? (
        <div className="al-empty">
          No audit log entries{actionFilter ? " for this filter" : ""}.
        </div>
      ) : (
        <>
          <div className="al-list">
            {logs.map((log) => (
              <LogCard key={log._id} log={log} />
            ))}
          </div>

          {pages > 1 && (
            <div className="al-pagination">
              <button
                className="al-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹ Prev
              </button>
              <span className="al-page-label">{page} / {pages}</span>
              <button
                className="al-page-btn"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}