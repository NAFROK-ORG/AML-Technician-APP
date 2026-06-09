const SecurityLog          = require("../models/SecurityLog");
const Entry                = require("../models/Entry");
const User                 = require("../models/User");
const { normalizeVehicleNo } = require("../utils/vehicleUtils");

// ─── Helper: UTC midnight ─────────────────────────────────────────────────────
// Same pattern as attendanceController.js — always normalize dates before
// any DB query so every record lands in the same calendar-day bucket.
function utcMidnight(input) {
  const d = input ? new Date(input) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── POST /api/security/log ───────────────────────────────────────────────────
// Creates a new vehicle log for the requesting security user.
// Only vehicleNo comes from req.body. Everything else is server-sourced:
//   branch    → User.findById (never req.body)
//   loggedBy  → req.user.userId (from JWT, never req.body)
//   date      → utcMidnight() (calendar bucket)
//   loggedAt  → new Date() (exact timestamp for linking algorithm)
const createLog = async (req, res) => {
  try {
    const { vehicleNo } = req.body;

    if (!vehicleNo || vehicleNo.trim().length < 2) {
      return res.status(400).json({
        message: "Vehicle number must be at least 2 characters",
      });
    }

    // Read branch from DB — same pattern as markAttendance.
    // Never trust req.body for branch.
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const trimmed       = vehicleNo.trim();
    const vehicleNoNorm = normalizeVehicleNo(trimmed);

    const log = await SecurityLog.create({
      vehicleNo:     trimmed,
      vehicleNoNorm,
      branch:        user.branch,
      loggedBy:      req.user.userId,
      date:          utcMidnight(),
      loggedAt:      new Date(), // NEVER from client
    });

    res.status(201).json(log);
  } catch (err) {
    console.error("[createLog]", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/security/today ──────────────────────────────────────────────────
// Returns all logs created by the requesting security user for today.
// Sorted newest first so the most recent log appears at the top of the dashboard.
const getTodayLogs = async (req, res) => {
  try {
    const logs = await SecurityLog.find({
      loggedBy: req.user.userId,
      date:     utcMidnight(),
    }).sort({ loggedAt: -1 });

    res.json(logs);
  } catch (err) {
    console.error("[getTodayLogs]", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/security/log/:id ────────────────────────────────────────────────
// Edits a security log. Only vehicleNo can be changed.
//
// CRITICAL: vehicleNoNorm is ALWAYS recomputed from the new vehicleNo.
// If this line is skipped, the log's vehicleNoNorm permanently stays at the
// old value, and all future linking for this log silently uses wrong data.
//
// Ownership enforced: only the security user who created the log can edit it.
// No delete route — audit integrity preserved.
const editLog = async (req, res) => {
  try {
    const { vehicleNo } = req.body;

    if (!vehicleNo || vehicleNo.trim().length < 2) {
      return res.status(400).json({
        message: "Vehicle number must be at least 2 characters",
      });
    }

    const log = await SecurityLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: "Log not found" });

    // Ownership check — security users can only edit their own logs.
    if (log.loggedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Cannot edit another user's log" });
    }

    const trimmed = vehicleNo.trim();
    log.vehicleNo     = trimmed;
    log.vehicleNoNorm = normalizeVehicleNo(trimmed); // ← CRITICAL — always recompute

    await log.save();
    res.json(log);
  } catch (err) {
    console.error("[editLog]", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/security/board ──────────────────────────────────────────────────
// Admin/Superadmin board: shows all security logs for a given date and branch,
// with linked job card entries attached to each log via the linking algorithm.
//
// Branch scoping follows the same pattern as attendanceController.getAdminAttendance:
//   Branch admin → branch forced from req.user.branch, ?branch param ignored
//   Superadmin   → optional ?branch=NAME filter, null = all branches
//
// The linking algorithm:
//   An Entry belongs to a SecurityLog when:
//     1. entry.vehicleNoNorm === log.vehicleNoNorm
//     2. entry.branch        === log.branch
//     3. entry.createdAt     >= log.loggedAt
//     4. entry.createdAt     <  nextLog.loggedAt (if a next log for same vehicle+branch exists)
//
// Finding nextLog requires no extra DB query — all logs for the date are already
// in memory. We fetch ALL logs first (for correct nextLog lookup across the full
// set), then paginate, then run the entry queries only for the current page.
const getBoardLogs = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    // Branch scoping — mirrors attendance admin endpoint exactly.
    const branch = isAdmin
      ? req.user.branch               // forced — ?branch param ignored for branch admins
      : (req.query.branch || null);   // superadmin: optional filter, null = all branches

    // Date target — defaults to today
    const targetDate = utcMidnight(
      req.query.date ? new Date(req.query.date) : null
    );

    // Vehicle number search filter (optional, min 3 chars)
    const q = (req.query.q || "").trim();

    // Pagination
    const LIMIT    = 10;
    const safePage = Math.max(parseInt(req.query.page, 10) || 1, 1);

    // ── Build filter ─────────────────────────────────────────────────────────
    const filter = { date: targetDate };
    if (branch) filter.branch = branch;
    if (q.length >= 3) {
      // Normalize the search query before regex — handles all hyphen/space variants.
      const normQ = normalizeVehicleNo(q);
      filter.vehicleNoNorm = { $regex: normQ, $options: "i" };
    }

    // ── Fetch ALL matching logs (for correct nextLog lookup) ──────────────────
    // We intentionally fetch all logs before pagination so the nextLog algorithm
    // can see the full sequence for any vehicle on this date, not just the current
    // page. At current scale (tens of logs per day), this is fast and simple.
    const allLogs = await SecurityLog.find(filter)
      .populate("loggedBy", "name")
      .sort({ vehicleNoNorm: 1, loggedAt: 1 })
      .lean();

    const total      = allLogs.length;
    const totalPages = Math.ceil(total / LIMIT);

    // Slice to current page for entry queries (avoid N queries for all logs)
    const pageLogs = allLogs.slice((safePage - 1) * LIMIT, safePage * LIMIT);

    // ── Linking algorithm — per log on current page ───────────────────────────
    const withEntries = await Promise.all(
      pageLogs.map(async (log) => {
        // Find the next log for this exact vehicle+branch in the full in-memory set.
        // "Next" = same vehicleNoNorm, same branch, later loggedAt.
        // This requires NO extra DB query — allLogs is already in memory.
        const nextLog = allLogs.find(
          (l) =>
            l.vehicleNoNorm === log.vehicleNoNorm &&
            l.branch        === log.branch &&
            l.loggedAt      >  log.loggedAt
        );

        // Entry filter: vehicle + branch + time window
        const entryFilter = {
          vehicleNoNorm: log.vehicleNoNorm,
          branch:        log.branch,
          createdAt:     { $gte: log.loggedAt },
        };
        // Rule 4: if a next log exists, entries before it belong to this visit.
        if (nextLog) entryFilter.createdAt.$lt = nextLog.loggedAt;

        const entries = await Entry.find(entryFilter)
          .populate("userId", "name technicianId technicianType")
          .sort({ createdAt: 1 })
          .lean();

        return {
          ...log,
          entries,
          status: entries.length > 0 ? "assigned" : "unassigned",
        };
      })
    );

    res.json({
      logs:       withEntries,
      total,
      page:       safePage,
      totalPages,
      date:       targetDate,
    });
  } catch (err) {
    console.error("[getBoardLogs]", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createLog, getTodayLogs, editLog, getBoardLogs };