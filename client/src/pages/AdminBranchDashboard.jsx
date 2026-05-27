import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";

const CATEGORY_COLORS = {
  "Engine Repair":   "#3B8FFF",
  "Electrical":      "#FFC107",
  "Body Work":       "#1DB87A",
  "Transmission":    "#CE93D8",
  "AC & Cooling":    "#00BCD4",
  "General Service": "#FF7043",
};

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="stat-label">{label}</span>
        <span style={{ fontSize: "18px" }}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminBranchDashboard() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [stats, setStats] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  // Fetch branch list on mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get("/api/admin/branches");
        setBranches(res.data);
        if (res.data.length > 0) setSelectedBranch(res.data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  // Fetch stats when branch changes
  useEffect(() => {
    if (!selectedBranch) return;
    const fetchStats = async () => {
      setLoadingStats(true);
      setStats(null);
      try {
        const res = await api.get(`/api/admin/branch/${encodeURIComponent(selectedBranch)}`);
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [selectedBranch]);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--navy)" }}>
      <Navbar />
      <div style={{ padding: "20px 16px", maxWidth: "700px", margin: "0 auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700" }}>Branch Dashboard</h1>
          <p style={{ color: "var(--steel)", fontSize: "13px", marginTop: "4px" }}>
            Select a branch to view performance overview
          </p>
        </div>

        {/* Branch Selector */}
        <div className="fade-up" style={{ marginBottom: "24px", animationDelay: "0.05s" }}>
          {loadingBranches ? (
            <div style={{ color: "var(--steel)", fontSize: "14px" }}>Loading branches…</div>
          ) : branches.length === 0 ? (
            <div className="al-card" style={{ color: "var(--steel)", textAlign: "center", padding: "32px" }}>
              No branches found. Technicians need to complete their profile setup first.
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {branches.map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBranch(b)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: selectedBranch === b ? "var(--blue)" : "var(--border)",
                    background: selectedBranch === b ? "rgba(30,111,217,0.15)" : "var(--navy-mid)",
                    color: selectedBranch === b ? "var(--blue-light)" : "var(--steel)",
                    fontWeight: selectedBranch === b ? "600" : "400",
                    fontSize: "14px",
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats section */}
        {selectedBranch && (
          loadingStats ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--steel)" }}>
              Loading stats…
            </div>
          ) : stats ? (
            <>
              {/* View Technicians CTA */}
              <div className="fade-up" style={{ marginBottom: "16px", animationDelay: "0.08s" }}>
                <button
                  className="al-btn"
                  onClick={() => navigate(`/admin/branch/${encodeURIComponent(selectedBranch)}`)}
                  style={{ fontSize: "14px" }}
                >
                  View Technicians in {selectedBranch} →
                </button>
              </div>

              {/* Stats grid */}
              <div className="fade-up" style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "10px", marginBottom: "20px", animationDelay: "0.1s",
              }}>
                <StatCard label="Technicians"      value={stats.technicianCount}                                              icon="👷" />
                <StatCard label="Total Entries"    value={stats.totalEntries}                                                 icon="📋" />
                <StatCard label="Hours Worked"     value={stats.totalHours}                                                   icon="⏱"  sub="hrs total" />
                <StatCard label="Avg Hours / Tech" value={stats.avgHoursPerTechnician}                                        icon="📊"  sub="hrs avg" />
                <StatCard label="Labour Total"     value={`₹${Number(stats.totalLabour).toLocaleString("en-IN")}`}            icon="💰" />
                <StatCard label="Incentives"       value={`₹${Number(stats.totalIncentives).toLocaleString("en-IN")}`}       icon="⭐" />
                <StatCard label="Leave Days"       value={stats.totalLeaveDays}                                               icon="🗓"  sub="days total" />
              </div>

              {/* Category Breakdown */}
              {stats.categoryBreakdown?.length > 0 && (
                <div className="fade-up al-card" style={{ animationDelay: "0.15s" }}>
                  <p style={{ fontWeight: "600", fontSize: "14px", marginBottom: "16px" }}>
                    Category Breakdown — {selectedBranch}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {stats.categoryBreakdown.map(({ _id, count }) => {
                      const maxCount = stats.categoryBreakdown[0].count;
                      const pct = Math.round((count / maxCount) * 100);
                      const color = CATEGORY_COLORS[_id] || "var(--blue)";
                      return (
                        <div key={_id}>
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: "6px",
                          }}>
                            <span style={{ fontSize: "13px" }}>{_id}</span>
                            <span style={{
                              fontSize: "13px", fontWeight: "600",
                              fontFamily: "'IBM Plex Mono', monospace",
                              color,
                            }}>{count}</span>
                          </div>
                          <div style={{
                            height: "5px", background: "var(--navy-light)",
                            borderRadius: "3px", overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: color, borderRadius: "3px",
                              transition: "width 0.5s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null
        )}

        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
}