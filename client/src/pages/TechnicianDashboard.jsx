import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import ProfileSetupModal from "../components/ProfileSetupModal";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";

/* ── Money formatter ── */
const fmtMoney = (n) => {
  if (n === 0) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

function StatCard({ label, value, unit }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {unit && <div className="stat-sub">{unit}</div>}
    </div>
  );
}

export default function TechnicianDashboard() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await api.get("/api/entries/my");
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalHours     = entries.reduce((s, e) => s + (e.hoursWorked    || 0), 0);
  const totalLabour    = entries.reduce((s, e) => s + (e.labourAmount   || 0), 0);
  const totalIncentive = entries.reduce((s, e) => s + (e.incentive      || 0), 0);
  const totalLeave     = entries.reduce((s, e) => s + (e.leaveDays      || 0), 0);
  const totalVehicles  = new Set(entries.map((e) => e.vehicleNo).filter(Boolean)).size;

  const needsProfile = user?.role === "technician" && !user?.profileComplete;

  return (
    <div style={{ minHeight: "100dvh", background: "#09090B" }}>
      {needsProfile && <ProfileSetupModal />}
      <Navbar />

      <div style={{ padding: "32px 20px 64px", maxWidth: "600px", margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div className="fade-up" style={{ marginBottom: "28px" }}>
          <div style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            color: "#3B82F6",
            fontWeight: "600",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}>
            Technician Dashboard
          </div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "38px",
            fontWeight: "700",
            color: "#FAFAFA",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            lineHeight: 1,
            marginBottom: "10px",
          }}>
            {user?.name?.split(" ")[0]}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {user?.technicianId && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                color: "#3B82F6",
                letterSpacing: "0.06em",
              }}>
                {user.technicianId}
              </span>
            )}
            {user?.branch && (
              <>
                <span style={{ color: "#3F3F46" }}>·</span>
                <span style={{
                  fontSize: "10px",
                  color: "#71717A",
                  fontWeight: "600",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>
                  {user.branch}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div
          className="stat-grid fade-up"
          style={{ marginBottom: "20px", animationDelay: "0.05s" }}
        >
          <StatCard label="Total Entries"   value={entries.length}                             />
          <StatCard label="Hours Worked"    value={totalHours}         unit="hrs total"         />
          <StatCard label="Labour Earned"   value={fmtMoney(totalLabour)}                      />
          <StatCard label="Incentives"      value={fmtMoney(totalIncentive)}                   />
          <StatCard label="Leave Days"      value={totalLeave}         unit="days taken"        />
          <StatCard label="Vehicles Served" value={totalVehicles}      unit="unique"            />
        </div>

        {/* ── New Entry CTA ── */}
        <div className="fade-up" style={{ marginBottom: "36px", animationDelay: "0.08s" }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: "100%",
              padding: "16px",
              background: "#FAFAFA",
              color: "#09090B",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "'IBM Plex Sans', sans-serif",
              transition: "background 0.15s",
              borderRadius: 0,
            }}
            onMouseOver={e => e.currentTarget.style.background = "#E4E4E7"}
            onMouseOut={e => e.currentTarget.style.background = "#FAFAFA"}
          >
            + New Entry
          </button>
        </div>

        {/* ── Entries section ── */}
        <div className="fade-up" style={{ animationDelay: "0.12s" }}>
          {/* Section header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "14px",
            borderBottom: "1px solid #27272A",
            marginBottom: "12px",
          }}>
            <div style={{
              fontSize: "9px",
              fontWeight: "600",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#71717A",
            }}>
              Work Entries
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: "#71717A",
            }}>
              {entries.length} total
            </div>
          </div>

          {loading ? (
            <div style={{
              textAlign: "center",
              padding: "48px 0",
              color: "#71717A",
              fontSize: "13px",
              fontWeight: "300",
              letterSpacing: "0.04em",
            }}>
              Loading…
            </div>
          ) : (
            <EntryTable entries={entries} onDeleted={fetchEntries} />
          )}
        </div>
      </div>

      {showForm && (
        <EntryForm onClose={() => setShowForm(false)} onSaved={fetchEntries} />
      )}
    </div>
  );
}