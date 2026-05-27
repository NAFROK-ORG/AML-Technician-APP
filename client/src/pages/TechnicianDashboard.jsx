import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import ProfileSetupModal from "../components/ProfileSetupModal";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";

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

  // Derived stats
  const totalHours     = entries.reduce((s, e) => s + (e.hoursWorked || 0), 0);
  const totalLabour    = entries.reduce((s, e) => s + (e.labourAmount || 0), 0);
  const totalIncentive = entries.reduce((s, e) => s + (e.incentive || 0), 0);
  const totalLeave     = entries.reduce((s, e) => s + (e.leaveDays || 0), 0);
  const totalVehicles  = new Set(entries.map((e) => e.vehicleNo).filter(Boolean)).size;

  // Only show modal for technicians who haven't completed profile
  // Admins skip this entirely — their role is set directly in DB, profileComplete stays false
  const needsProfile = user?.role === "technician" && !user?.profileComplete;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--navy)" }}>
      {needsProfile && <ProfileSetupModal />}
      <Navbar />

      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>

        {/* Welcome bar */}
        <div className="fade-up" style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700" }}>
            Hello, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--steel)", fontSize: "13px", marginTop: "4px" }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: "var(--blue-light)", fontSize: "12px",
            }}>{user?.technicianId}</span>
            {user?.branch && (
              <span style={{ marginLeft: "8px" }}>· {user.branch} Branch</span>
            )}
          </p>
        </div>

        {/* Stats grid */}
        <div className="fade-up" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "10px", marginBottom: "24px",
          animationDelay: "0.05s",
        }}>
          <StatCard label="Total Entries"   value={entries.length}                                   icon="📋" />
          <StatCard label="Hours Worked"    value={totalHours}                                       icon="⏱"  sub="hrs total" />
          <StatCard label="Labour Earned"   value={`₹${totalLabour.toLocaleString("en-IN")}`}        icon="💰" />
          <StatCard label="Incentives"      value={`₹${totalIncentive.toLocaleString("en-IN")}`}     icon="⭐" />
          <StatCard label="Leave Days"      value={totalLeave}                                       icon="🗓"  sub="days taken" />
          <StatCard label="Vehicles Worked" value={totalVehicles}                                    icon="🚛" sub="unique vehicles" />
        </div>

        {/* New Entry button */}
        <div className="fade-up" style={{ marginBottom: "20px", animationDelay: "0.1s" }}>
          <button
            className="al-btn"
            onClick={() => setShowForm(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", fontSize: "15px",
            }}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>+</span> New Entry
          </button>
        </div>

        {/* Entries heading */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "12px",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>My Entries</h2>
          <span style={{
            fontSize: "12px", color: "var(--steel)",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>{entries.length} total</span>
        </div>

        {/* Entries list */}
        <div className="fade-up" style={{ animationDelay: "0.15s" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--steel)" }}>
              Loading entries…
            </div>
          ) : (
            <EntryTable entries={entries} onDeleted={fetchEntries} />
          )}
        </div>
      </div>

      {showForm && (
        <EntryForm
          onClose={() => setShowForm(false)}
          onSaved={fetchEntries}
        />
      )}
    </div>
  );
}