import api from "../api/axios";

const CATEGORY_COLORS = {
  "Engine Repair":  { bg: "rgba(30,111,217,0.15)", color: "#3B8FFF" },
  "Electrical":     { bg: "rgba(255,193,7,0.12)",  color: "#FFC107" },
  "Body Work":      { bg: "rgba(29,184,122,0.12)", color: "#1DB87A" },
  "Transmission":   { bg: "rgba(156,39,176,0.12)", color: "#CE93D8" },
  "AC & Cooling":   { bg: "rgba(0,188,212,0.12)",  color: "#00BCD4" },
  "General Service":{ bg: "rgba(255,87,34,0.12)",  color: "#FF7043" },
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
        textAlign: "center", padding: "48px 20px",
        background: "var(--navy-mid)", border: "1px solid var(--border)",
        borderRadius: "12px",
      }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
        <p style={{ fontWeight: "600", marginBottom: "4px" }}>No entries yet</p>
        <p style={{ color: "var(--steel)", fontSize: "14px" }}>Tap "+ New Entry" to log your first job</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {entries.map((entry) => {
        const catStyle = CATEGORY_COLORS[entry.category] || { bg: "rgba(139,163,199,0.12)", color: "var(--steel)" };
        const date = new Date(entry.date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        });
        return (
          <div key={entry._id} style={{
            background: "var(--navy-mid)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px",
          }}>
            {/* Top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <span style={{
                  display: "inline-block",
                  background: catStyle.bg, color: catStyle.color,
                  fontSize: "11px", fontWeight: "600",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "3px 10px", borderRadius: "20px", marginBottom: "6px",
                }}>{entry.category}</span>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", color: "var(--steel)" }}>
                  JC: {entry.jcNo}
                  {entry.vehicleNo && <span style={{ marginLeft: "10px" }}> · {entry.vehicleNo}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", color: "var(--steel)" }}>{date}</div>
                <button
                  onClick={() => handleDelete(entry._id)}
                  style={{
                    marginTop: "6px", background: "transparent",
                    border: "none", color: "rgba(224,59,59,0.5)",
                    fontSize: "12px", cursor: "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    padding: "2px 0",
                  }}
                  onMouseOver={e => e.target.style.color = "var(--danger)"}
                  onMouseOut={e => e.target.style.color = "rgba(224,59,59,0.5)"}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border)",
            }}>
              {[
                { label: "Labour", value: `₹${entry.labourAmount}` },
                { label: "Hours", value: entry.hoursWorked },
                { label: "Leave", value: `${entry.leaveDays}d` },
                { label: "Incentive", value: `₹${entry.incentive}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--steel)", marginBottom: "2px", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
