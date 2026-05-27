import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";

export default function AdminTechnicianList() {
  const { branch } = useParams();
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const res = await api.get(`/api/admin/branch/${encodeURIComponent(branch)}/technicians`);
        setTechnicians(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTechnicians();
  }, [branch]);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--navy)" }}>
      <Navbar />
      <div style={{ padding: "20px 16px", maxWidth: "700px", margin: "0 auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: "20px" }}>
          <button
            onClick={() => navigate("/admin")}
            style={{
              background: "transparent", border: "none",
              color: "var(--steel)", fontSize: "13px", cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginBottom: "8px", padding: "0",
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            ← Back to Branches
          </button>
          <h1 style={{ fontSize: "22px", fontWeight: "700" }}>{branch} Branch</h1>
          <p style={{ color: "var(--steel)", fontSize: "13px", marginTop: "4px" }}>
            {loading ? "…" : `${technicians.length} technician${technicians.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--steel)" }}>
            Loading technicians…
          </div>
        ) : technicians.length === 0 ? (
          <div className="al-card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>👷</div>
            <p style={{ fontWeight: "600" }}>No technicians yet</p>
            <p style={{ color: "var(--steel)", fontSize: "14px", marginTop: "4px" }}>
              No technicians have completed profile setup in this branch.
            </p>
          </div>
        ) : (
          <div
            className="fade-up"
            style={{ display: "flex", flexDirection: "column", gap: "10px", animationDelay: "0.05s" }}
          >
            {technicians.map(tech => (
              <div
                key={tech.id}
                onClick={() => navigate(`/admin/technician/${tech.id}`)}
                style={{
                  background: "var(--navy-mid)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = "var(--blue)";
                  e.currentTarget.style.background = "rgba(30,111,217,0.06)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--navy-mid)";
                }}
              >
                {/* Top row */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: "12px",
                }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "15px" }}>{tech.name}</div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "12px", color: "var(--blue-light)", marginTop: "3px",
                    }}>
                      {tech.technicianId}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--steel)", marginTop: "2px" }}>
                      {tech.email}
                    </div>
                  </div>
                  <span style={{ color: "var(--steel)", fontSize: "20px", lineHeight: 1 }}>→</span>
                </div>

                {/* Stats row */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border)",
                }}>
                  {[
                    { label: "Entries", value: tech.totalEntries },
                    { label: "Hours",   value: tech.totalHours },
                    { label: "Labour",  value: `₹${Number(tech.totalLabour).toLocaleString("en-IN")}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: "11px", color: "var(--steel)",
                        marginBottom: "2px", letterSpacing: "0.05em",
                      }}>
                        {label}
                      </div>
                      <div style={{
                        fontSize: "14px", fontWeight: "600",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
}