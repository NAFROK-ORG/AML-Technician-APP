import api from "../api/axios";

/* Category → a single accent color for the left border */
const CAT_COLOR = {
  "Engine Repair":   "#3B82F6",   /* blue    */
  "Electrical":      "#EAB308",   /* yellow  */
  "Body Work":       "#22C55E",   /* green   */
  "Transmission":    "#A855F7",   /* purple  */
  "AC & Cooling":    "#06B6D4",   /* cyan    */
  "General Service": "#F97316",   /* orange  */
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
        background: "#18181B",
        border: "1px solid #27272A",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "20px",
          fontWeight: "700",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#3F3F46",
          marginBottom: "6px",
        }}>
          No Entries Yet
        </div>
        <p style={{
          color: "#71717A",
          fontSize: "13px",
          fontWeight: "300",
          letterSpacing: "0.02em",
        }}>
          Tap "+ New Entry" to log your first job card
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {entries.map((entry) => {
        const color = CAT_COLOR[entry.category] || "#71717A";

        const date = new Date(entry.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });

        return (
          <div
            key={entry._id}
            style={{
              background: "#18181B",
              border: "1px solid #27272A",
              borderLeft: `3px solid ${color}`,
              padding: "16px 18px",
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
                {/* Category label — colored text, no pill */}
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
                  color: "#A1A1AA",
                  letterSpacing: "0.04em",
                }}>
                  {entry.jcNo}
                  {entry.vehicleNo && (
                    <span style={{ marginLeft: "10px", color: "#71717A" }}>
                      · {entry.vehicleNo}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                color: "#71717A",
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
              borderTop: "1px solid #27272A",
            }}>
              {[
                { label: "Labour",    value: `₹${(entry.labourAmount || 0).toLocaleString("en-IN")}` },
                { label: "Hours",     value: `${entry.hoursWorked || 0}h` },
                { label: "Leave",     value: `${entry.leaveDays || 0}d` },
                { label: "Incentive", value: `₹${entry.incentive || 0}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{
                    fontSize: "9px",
                    color: "#71717A",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: "600",
                    marginBottom: "3px",
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#FAFAFA",
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
                  color: "#3F3F46",
                  fontSize: "9px",
                  fontWeight: "600",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  padding: "2px 0",
                  transition: "color 0.15s",
                }}
                onMouseOver={e => e.currentTarget.style.color = "#EF4444"}
                onMouseOut={e => e.currentTarget.style.color = "#3F3F46"}
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