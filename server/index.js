require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const cron    = require("node-cron");

const connectDB         = require("./config/db");
const Attendance        = require("./models/Attendance");
const securityRoutes = require("./routes/securityRoutes");
const authRoutes        = require("./routes/authRoutes");
const entryRoutes       = require("./routes/entryRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const attendanceRoutes  = require("./routes/attendanceRoutes");
const searchRoutes      = require("./routes/searchRoutes");       // ← new
const auditRoutes = require("./routes/auditRoutes");
const app = express();

connectDB();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/audit", auditRoutes);
app.get("/", (req, res) =>
  res.json({ message: "Ashok Leyland API running" })
);

// KEEP THIS LAST
app.use((req, res) =>
  res.status(404).json({ message: "Route not found" })
);
// ── Scheduled Jobs ───────────────────────────────────────────────────────────

// Monthly cleanup — 5th of every month at midnight (00:00).
// ONLY deletes from the `attendance` collection.
// Never touches `entries`, `users`, or any other collection.
cron.schedule("0 0 5 * *", async () => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setUTCHours(0, 0, 0, 0);

    // Attendance.deleteMany is scoped to the attendance collection only.
    const result = await Attendance.deleteMany({ date: { $lt: oneMonthAgo } });

    console.log(
      `[Cron] Monthly attendance cleanup — ${result.deletedCount} records deleted ` +
      `(older than ${oneMonthAgo.toISOString().split("T")[0]})`
    );
  } catch (err) {
    console.error("[Cron] Monthly attendance cleanup failed:", err);
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));