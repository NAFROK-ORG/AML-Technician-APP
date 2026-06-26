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
   connectSrc: [
  "'self'",
  "https://o4511180998967296.ingest.us.sentry.io",  // ← Sentry error reporting
],
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
// Overlap guard — prevents a second trigger from running if the first
// deleteMany is still in progress (slow Mongo, cold restart race, etc.)
let cleanupRunning = false;

// Monthly cleanup — 5th of every month at 00:00 UTC (05:30 AM IST).
//
// CUTOFF: start of the previous calendar month (UTC midnight, 1st).
//   Example: runs June 5  →  cutoff = May 1  →  deletes April and earlier.
//   May's full records are preserved. June's partial records are preserved.
//   Running on the 5th gives branch managers a 5-day buffer to review
//   the previous month before anything is touched.
//
// WHY NOT the 1st of the month: cutoff is always "start of previous month"
//   regardless of run date, so data safety is identical — but the 5th gives
//   ops time to manually intervene if something looks wrong before cleanup fires.
//
// Date.UTC(-1 month): when month = 0 (January), month - 1 = -1.
//   Date.UTC handles this correctly — rolls back to December of prior year.
//   Verified: new Date(Date.UTC(2025, -1, 1)) === 2024-12-01T00:00:00.000Z
//
// ONLY deletes from the `attendance` collection.
// Never touches entries, users, security logs, or audit logs.
cron.schedule("0 0 5 * *", async () => {
  if (cleanupRunning) {
    console.warn("[Cron] Monthly attendance cleanup already running — skipping this trigger.");
    return;
  }
  cleanupRunning = true;

  try {
    const now = new Date();

    // Start of the previous calendar month — always a clean UTC midnight boundary.
    // Date.UTC() never uses local timezone, safe on any host.
    const cutoff = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 1, // Date.UTC handles January (0-1 = -1) correctly
      1
    ));

    // Count before deleting — never destroy blind.
    const countBefore = await Attendance.countDocuments({ date: { $lt: cutoff } });

    if (countBefore === 0) {
      console.log(
        `[Cron] Monthly attendance cleanup — nothing to delete ` +
        `(cutoff: ${cutoff.toISOString().slice(0, 10)})`
      );
      return;
    }

    const result = await Attendance.deleteMany({ date: { $lt: cutoff } });

    console.log(
      `[Cron] Monthly attendance cleanup complete — ` +
      `${result.deletedCount}/${countBefore} records deleted ` +
      `(records before ${cutoff.toISOString().slice(0, 10)})`
    );
  } catch (err) {
    console.error("[Cron] Monthly attendance cleanup failed:", err);
    // Sentry captures this automatically. No re-throw — a failed cleanup
    // must never crash the server process.
  } finally {
    // Always release the guard, even if the try block returned early.
    cleanupRunning = false;
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));