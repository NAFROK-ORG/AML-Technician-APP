import { useState, useEffect, useCallback, memo } from "react";
import api from "../api/axios";

// ─── Constants ─────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

const CAT_COLOR = {
  "ENGINE REPAIR":    "#2563EB",
  "GEAR BOX":         "#DC2626",
  "ELECTRICAL":       "#F59E0B",
  "BODY WORK":        "#16A34A",
  "DIFFERENTIAL":     "#DB2777",
  "TRANSMISSION":     "#7C3AED",
  "AC & COOLING":     "#0891B2",
  "EATS FLUSHING":    "#92400E",
  "GENERAL SERVICE":  "#EA580C",
  "SCHEDULE SERVICE": "#374151",
};

// ─── Pagination styles — injected once ─────────────────────────────────────
const ET_STYLES = `
  .et-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #F8FAFC;
    border-top: 1.5px solid #EEF2F7;
    gap: 8px;
    flex-wrap: wrap;
  }
  .et-page-info {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 600;
    color: #6B7A99;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .et-page-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .et-page-btn {
    height: 34px;
    min-width: 34px;
    padding: 0 12px;
    background: #FFFFFF;
    border: 1.5px solid #DDE3EE;
    color: #374151;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
    user-select: none;
  }
  .et-page-btn:hover:not(:disabled) {
    border-color: #1E3A8A;
    color: #1E3A8A;
    background: #EFF6FF;
  }
  .et-page-btn:active:not(:disabled) {
    background: #DBEAFE;
  }
  .et-page-btn:disabled {
    color: #CBD5E1;
    border-color: #EEF2F7;
    cursor: not-allowed;
    background: #F8FAFC;
  }
  .et-page-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    color: #0A1628;
    white-space: nowrap;
    min-width: 52px;
    text-align: center;
    letter-spacing: 0.04em;
  }
  @media (max-width: 380px) {
    .et-page-info { font-size: 9px; }
    .et-page-btn  { font-size: 10px; padding: 0 9px; height: 32px; }
  }
`;

if (typeof document !== "undefined") {
  const _id = "et-styles";
  if (!document.getElementById(_id)) {
    const el = document.createElement("style");
    el.id = _id;
    el.textContent = ET_STYLES;
    document.head.appendChild(el);
  }
}

// ─── Pagination control ─────────────────────────────────────────────────────
const Pagination = memo(function Pagination({ page, totalPages, total, onPrev, onNext }) {
  const from = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const to   = Math.min(page * ITEMS_PER_PAGE, total);

  return (
    <div className="et-pagination">
      <span className="et-page-info">{from}–{to} of {total} entries</span>
      <div className="et-page-controls">
        <button
          className="et-page-btn"
          onClick={onPrev}
          disabled={page === 1}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        <span className="et-page-label">{page} / {totalPages}</span>
        <button
          className="et-page-btn"
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    </div>
  );
});

// ─── Single entry row ───────────────────────────────────────────────────────
const EntryRow = memo(function EntryRow({ entry, onEdit, onDelete }) {
  const color = CAT_COLOR[entry.category] || "#6B7A99";

  const date = new Date(entry.date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit",
  });

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #EEF2F7",
        borderLeft: `3px solid ${color}`,
        padding: "16px 20px",
      }}
    >
      {/* ── Top row ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "14px",
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.14em",
            textTransform: "uppercase", color, marginBottom: "5px",
          }}>
            {entry.category}
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "12px", color: "#374151", letterSpacing: "0.04em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.jcNo}
            {entry.vehicleNo && (
              <span style={{ marginLeft: "10px", color: "#94A3B8" }}>
                · {entry.vehicleNo}
              </span>
            )}
          </div>
        </div>

        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "11px", color: "#94A3B8",
          textAlign: "right", flexShrink: 0, marginLeft: "12px",
        }}>
          {date}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "8px",
        paddingTop: "12px",
        borderTop: "1px solid #EEF2F7",
      }}>
        {[
          { label: "Labour",    value: `₹${(entry.labourAmount || 0).toLocaleString("en-IN")}` },
          { label: "Hours",     value: `${entry.hoursWorked || 0}h` },
          { label: "Leave",     value: `${entry.leaveDays || 0}d` },
          { label: "Incentive", value: `₹${entry.incentive || 0}` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{
              fontSize: "8px", color: "#94A3B8", letterSpacing: "0.12em",
              textTransform: "uppercase", fontWeight: "700", marginBottom: "3px",
            }}>
              {label}
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "13px", fontWeight: "600", color: "#0A1628",
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Actions row ── */}
      <div style={{
        display: "flex", justifyContent: "flex-end",
        alignItems: "center", gap: "16px", marginTop: "10px",
      }}>
        {typeof onEdit === "function" && (
          <button
            onClick={() => onEdit(entry)}
            style={{
              background: "#FFFBEB",
              border: "1px solid #FCD34D",
              borderRadius: "4px",
              color: "#B45309",
              fontSize: "9px",
              fontWeight: "700",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              padding: "5px 12px",
              transition: "background 0.15s, border-color 0.15s, color 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background  = "#FEF3C7";
              e.currentTarget.style.borderColor = "#F59E0B";
              e.currentTarget.style.color       = "#92400E";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background  = "#FFFBEB";
              e.currentTarget.style.borderColor = "#FCD34D";
              e.currentTarget.style.color       = "#B45309";
            }}
          >
            ✎ Edit
          </button>
        )}

        <button
          onClick={() => onDelete(entry._id)}
          style={{
            background: "transparent", border: "none",
            color: "#CBD5E1", fontSize: "9px", fontWeight: "700",
            letterSpacing: "0.14em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
            padding: "5px 0", transition: "color 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#DC2626")}
          onMouseOut={(e)  => (e.currentTarget.style.color = "#CBD5E1")}
        >
          Delete
        </button>
      </div>
    </div>
  );
});

// ─── Main EntryTable ────────────────────────────────────────────────────────
export default function EntryTable({ entries, onDeleted, onEdit }) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the entries list length changes
  // (new entry added, entry deleted, fresh fetch)
  useEffect(() => {
    setPage(1);
  }, [entries.length]);

  const totalPages    = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));
  const safePageParam = Math.min(page, totalPages);
  const start         = (safePageParam - 1) * ITEMS_PER_PAGE;
  const visibleEntries = entries.slice(start, start + ITEMS_PER_PAGE);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await api.delete(`/api/entries/${id}`);
      onDeleted();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  }, [onDeleted]);

  const handlePrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNext = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

  // ── Empty state ──
  if (entries.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: "52px 20px",
        background: "#F8FAFC",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "20px", fontWeight: "700",
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "#94A3B8", marginBottom: "6px",
        }}>
          No Entries Yet
        </div>
        <p style={{
          color: "#94A3B8", fontSize: "12px",
          fontWeight: "400", letterSpacing: "0.04em", margin: 0,
        }}>
          Tap "+ New Entry" to log your first job card
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {visibleEntries.map((entry) => (
        <EntryRow
          key={entry._id}
          entry={entry}
          onEdit={onEdit}
          onDelete={handleDelete}
        />
      ))}

      {/* Only show pagination when there's more than one page */}
      {entries.length > ITEMS_PER_PAGE && (
        <Pagination
          page={safePageParam}
          totalPages={totalPages}
          total={entries.length}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}