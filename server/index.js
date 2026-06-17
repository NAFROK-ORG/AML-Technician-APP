require("./instrument"); // MUST be the very first require — before everything else
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const cron    = require("node-cron");
const Sentry  = require("@sentry/node");

const connectDB         = require("./config/db");
const Attendance        = require("./models/Attendance");
const securityRoutes = require("./routes/securityRoutes");
const authRoutes        = require("./routes/authRoutes");
const entryRoutes       = require("./routes/entryRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const attendanceRoutes  = require("./routes/attendanceRoutes");
const searchRoutes      = require("./routes/searchRoutes");       // ← new
const auditRoutes = require("./routes/auditRoutes");
const { generalLimiter, authLimiter } = require("./middleware/rateLimiter");
const app = express();
app.set("trust proxy", 1);
connectDB();

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:     ["'none'"],   // deny everything — API serves JSON only
      connectSrc:     ["'self'"],   // allow same-origin fetch/XHR
      frameAncestors: ["'none'"],   // prevent this API being embedded in iframes
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],
    },
  },
}));
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Global rate limit — applies to every route, protects against abusive or
// runaway request volume. `trust proxy` is already set above, so this reads
// the real client IP via X-Forwarded-For on Render rather than rate-limiting
// Render's proxy IP for everyone.
app.use(generalLimiter);

// Stricter limit specifically on login, layered on top of the general one.
// Registered before authRoutes so it only wraps this one path — signup,
// profile-setup, etc. under /api/auth are untouched by this and still only
// covered by generalLimiter above.
app.use("/api/auth/login", authLimiter);

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

// KEEP THIS LAST (before the Sentry error handler)
app.use((req, res) =>
  res.status(404).json({ message: "Route not found" })
);

// Sentry's error handler must be registered after all routes/controllers so
// it sees thrown/forwarded errors, and before any other error-handling
// middleware you add in the future.
Sentry.setupExpressErrorHandler(app);

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