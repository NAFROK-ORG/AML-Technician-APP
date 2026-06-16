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
  .al-card.delete    { border-left-color: #DC2626; }
  .al-card.edit      { border-left-color: #1E3A8A; }
  .al-card.edit-self { border-left-color: #7C3AED; }

  .al-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .al-action-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 3px 8px; border: 1px solid; }
  .al-action-badge.delete    { color: #DC2626; border-color: #FCA5A5; background: #FEF2F2; }
  .al-action-badge.edit      { color: #1E3A8A; border-color: #BFDBFE; background: #EFF6FF; }
  .al-action-badge.edit-self { color: #7C3AED; border-color: #C4B5FD; background: #F5F3FF; }
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

  /* ── Flush confirmation modal ─────────────────────────────────────────── */
  .al-modal-overlay {
    position: fixed; inset: 0; background: rgba(10,22,40,0.72);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 20px;
  }
  .al-modal {
    background: #FFFFFF; border: 1px solid #DDE3EE; border-top: 4px solid #DC2626;
    padding: 28px 24px; max-width: 420px; width: 100%;
  }
  .al-modal-title {
    font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700;
    color: #DC2626; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.02em;
  }
  .al-modal-text { font-size: 12px; color: #374151; line-height: 1.7; margin-bottom: 18px; }
  .al-modal-text strong { color: #0A1628; }
  .al-modal-label {
    display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #0A1628; margin-bottom: 6px;
  }
  .al-modal-input {
    width: 100%; height: 40px; padding: 0 12px; border: 1.5px solid #DDE3EE;
    font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600;
    color: #0A1628; outline: none; box-sizing: border-box; border-radius: 0;
  }
  .al-modal-input:focus { border-color: #DC2626; }
  .al-modal-actions { display: flex; gap: 8px; margin-top: 18px; justify-content: flex-end; }
  .al-modal-cancel {
    height: 36px; padding: 0 16px; background: #F8FAFC; border: 1.5px solid #DDE3EE;
    color: #374151; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0;
  }
  .al-modal-cancel:hover { background: #EEF2F7; }
  .al-modal-confirm {
    height: 36px; padding: 0 16px; background: #DC2626; border: 1.5px solid #DC2626;
    color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    border-radius: 0; transition: background 0.15s;
  }
  .al-modal-confirm:hover:not(:disabled) { background: #B91C1C; border-color: #B91C1C; }
  .al-modal-confirm:disabled { background: #FCA5A5; border-color: #FCA5A5; cursor: not-allowed; }
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

  const isDelete   = log.action === "DELETE_ENTRY";
  const isSelfEdit = log.action === "EDIT_ENTRY_SELF";

  // Card accent, badge colour, and badge label all derived from action type.
  // EDIT_ENTRY      → admin edited someone else's entry (blue)
  // EDIT_ENTRY_SELF → technician edited their own entry (purple)
  // DELETE_ENTRY    → admin deleted an entry (red)
  const cardClass  = isDelete ? "delete" : isSelfEdit ? "edit-self" : "edit";
  const badgeText  = isDelete ? "Deleted" : isSelfEdit ? "Self-Edit" : "Edited";

  return (
    <div className={`al-card ${cardClass}`}>
      <div className="al-card-top">
        <span className={`al-action-badge ${cardClass}`}>{badgeText}</span>
        <span className="al-timestamp">{fmtDateTime(log.createdAt)}</span>
      </div>

      <div className="al-row">
        <b>{log.performedByName}</b> ({log.performedByRole},{" "}
        {log.performedByBranch || "—"})
        {" "}
        {isDelete ? (
          <>deleted an entry belonging to <b>{log.targetUserName}</b></>
        ) : isSelfEdit ? (
          // Actor and target are the same person — no need to repeat the name
          <>edited their own entry</>
        ) : (
          <>edited an entry belonging to <b>{log.targetUserName}</b></>
        )}
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

      <button
        className="al-snapshot-toggle"
        onClick={() => setShowSnapshot((s) => !s)}
      >
        {showSnapshot ? "Hide" : "View"} full entry snapshot (pre-
        {isDelete ? "delete" : "edit"})
      </button>
      {showSnapshot && (
        <pre className="al-snapshot">
          {JSON.stringify(log.entrySnapshot, null, 2)}
        </pre>
      )}
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────
export default function AuditLog() {
  const { user } = useAuthStore();

  const [logs,          setLogs]          = useState([]);
  const [page,          setPage]          = useState(1);
  const [pages,         setPages]         = useState(1);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [actionFilter,  setActionFilter]  = useState("");
  const [flushing,      setFlushing]      = useState(false);

  // Flush modal state
  const [showFlushModal, setShowFlushModal] = useState(false);
  const [flushPhrase,    setFlushPhrase]    = useState("");

  // Style injection
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
  useEffect(() => { setPage(1); }, [actionFilter]);

  // Opens the modal — actual flush is in confirmFlush below
  const handleFlush = () => {
    setFlushPhrase("");
    setShowFlushModal(true);
  };

  // Called only when the user clicks "Confirm Flush" inside the modal
  // with the correct phrase. Backend validates the phrase independently
  // so even a direct API call without the UI still requires it.
  const confirmFlush = async () => {
    setFlushing(true);
    try {
      await api.delete("/api/audit/flush", {
        data: { confirmPhrase: flushPhrase },
      });
      setLogs([]);
      setTotal(0);
      setPages(1);
      setPage(1);
      setShowFlushModal(false);
      setFlushPhrase("");
    } catch (err) {
      alert(err.response?.data?.message || "Flush failed");
    } finally {
      setFlushing(false);
    }
  };

  const closeModal = () => {
    if (flushing) return; // don't close mid-request
    setShowFlushModal(false);
    setFlushPhrase("");
  };

  // Frontend gate: superadmin only
  if (user && user.role !== "superadmin") {
    return (
      <div className="al-page">
        <Navbar />
        <div className="al-denied">
          <div className="al-denied-title">Access Restricted</div>
          <p className="al-denied-text">
            The audit log is visible to superadmins only.
          </p>
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
            <option value="EDIT_ENTRY">Admin Edits Only</option>
            <option value="EDIT_ENTRY_SELF">Technician Self-Edits</option>
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

      {/* ── Flush confirmation modal ────────────────────────────────────── */}
      {showFlushModal && (
        <div className="al-modal-overlay" onClick={(e) => {
          // Close on backdrop click, not on modal itself
          if (e.target === e.currentTarget) closeModal();
        }}>
          <div className="al-modal">
            <div className="al-modal-title">Flush Audit Logs</div>
            <p className="al-modal-text">
              This will <strong>permanently delete all {total} audit log
              records</strong>. There is no recovery path — no backup, no soft
              delete, no undo. Type <strong>FLUSH ALL LOGS</strong> exactly to
              confirm.
            </p>
            <label className="al-modal-label">Confirmation Phrase</label>
            <input
              className="al-modal-input"
              type="text"
              placeholder="FLUSH ALL LOGS"
              value={flushPhrase}
              onChange={(e) => setFlushPhrase(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && flushPhrase === "FLUSH ALL LOGS") confirmFlush();
                if (e.key === "Escape") closeModal();
              }}
            />
            <div className="al-modal-actions">
              <button
                className="al-modal-cancel"
                onClick={closeModal}
                disabled={flushing}
              >
                Cancel
              </button>
              <button
                className="al-modal-confirm"
                onClick={confirmFlush}
                disabled={flushing || flushPhrase !== "FLUSH ALL LOGS"}
              >
                {flushing ? "Flushing…" : "Confirm Flush"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}