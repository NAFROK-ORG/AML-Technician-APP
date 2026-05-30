import api from "../api/axios";

/* Category → accent color (darker variants for light backgrounds) */
const CAT_COLOR = {
  "ENGINE REPAIR":    "#2563EB", // Blue
  "GEAR BOX":         "#DC2626", // Red
  "ELECTRICAL":       "#F59E0B", // Amber
  "BODY WORK":        "#16A34A", // Green
  "DIFFERENTIAL":     "#DB2777", // Magenta
  "TRANSMISSION":     "#7C3AED", // Purple
  "AC & COOLING":     "#0891B2", // Cyan
  "EATS FLUSHING":    "#92400E", // Brown
  "GENERAL SERVICE":  "#EA580C", // Orange
  "SCHEDULE SERVICE": "#374151", // Slate Gray
};

export default function EntryTable({ entries, onDeleted }) {
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await api.delete(`/api/entries/${id}`);
      onDeleted();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  if (entries.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: "52px 20px",
        background: "#F8FAFC",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "20px",
          fontWeight: "700",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#94A3B8",
          marginBottom: "6px",
        }}>
          No Entries Yet
        </div>
        <p style={{
          color: "#94A3B8",
          fontSize: "12px",
          fontWeight: "400",
          letterSpacing: "0.04em",
          margin: 0,
        }}>
          Tap "+ New Entry" to log your first job card
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {entries.map((entry) => {
        const color = CAT_COLOR[entry.category] || "#6B7A99";

        const date = new Date(entry.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });

        return (
          <div
            key={entry._id}
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
              <div>
                {/* Category label */}
                <div style={{
                  fontSize: "9px",
                  fontWeight: "700",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: color,
                  marginBottom: "5px",
                }}>
                  {entry.category}
                </div>

                {/* JC No + Vehicle No */}
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "12px",
                  color: "#374151",
                  letterSpacing: "0.04em",
                }}>
                  {entry.jcNo}
                  {entry.vehicleNo && (
                    <span style={{ marginLeft: "10px", color: "#94A3B8" }}>
                      · {entry.vehicleNo}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                color: "#94A3B8",
                textAlign: "right",
                flexShrink: 0,
                marginLeft: "12px",
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
                    fontSize: "8px",
                    color: "#94A3B8",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: "700",
                    marginBottom: "3px",
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#0A1628",
                  }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Delete ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                onClick={() => handleDelete(entry._id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#CBD5E1",
                  fontSize: "9px",
                  fontWeight: "700",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  padding: "4px 0",
                  transition: "color 0.15s",
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
      })}
    </div>
  );
}