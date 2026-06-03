const Attendance = require("../models/Attendance");
const User       = require("../models/User");
const Entry      = require("../models/Entry");

// ─── Helper: UTC midnight for a given date (or today) ────────────────────────
// All dates are normalized to UTC midnight so one calendar day = one bucket.
function utcMidnight(input) {
  const d = input ? new Date(input) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── GET /api/attendance/today ────────────────────────────────────────────────
// Technician: check whether today's attendance has already been marked.
// Returns: { marked: bool, markedAt: Date|null, date: Date }
exports.getTodayStatus = async (req, res) => {
  try {
    const today  = utcMidnight();
    const record = await Attendance.findOne({
      userId: req.user.userId,
      date:   today,
    }).lean();

    res.json({
      marked:   !!record,
      markedAt: record?.markedAt ?? null,
      date:     today,
    });
  } catch (err) {
    console.error("[Attendance] getTodayStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/attendance/mark ────────────────────────────────────────────────
// Technician: mark present for today. One-time, idempotent (safe to call twice).
exports.markAttendance = async (req, res) => {
  try {
    const { userId } = req.user;
    const today      = utcMidnight();

    // Idempotency: already marked → return existing record
    const existing = await Attendance.findOne({ userId, date: today }).lean();
    if (existing) {
      return res.json({ already: true, attendance: existing });
    }

    // Verify user & branch
    const user = await User.findById(userId).select("branch profileComplete").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.profileComplete || !user.branch) {
      return res.status(400).json({
        message: "Complete profile setup before marking attendance",
      });
    }

    const attendance = await Attendance.create({
      userId,
      branch:   user.branch,
      date:     today,
      markedAt: new Date(),
    });

    res.status(201).json({ already: false, attendance });
  } catch (err) {
    // Race condition: two simultaneous POST /mark hit the unique index
    if (err.code === 11000) {
      const existing = await Attendance.findOne({
        userId: req.user.userId,
        date:   utcMidnight(),
      }).lean();
      return res.json({ already: true, attendance: existing });
    }
    console.error("[Attendance] markAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/attendance/admin ────────────────────────────────────────────────
// Admin/Superadmin: full attendance board for a date.
//   Branch admin  → forced to req.user.branch (branchGuard enforces valid branch)
//   Superadmin    → optional ?branch=NAME (null = all branches)
//   Query params  → ?date=YYYY-MM-DD (defaults to today)
//
// Response shape per technician:
//   { technician, status, markedAt, entriesCount, entries: [...] | null }
exports.getAdminAttendance = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    // Branch scoping — mirrors the pattern used in adminController.js
    const branch = isAdmin
      ? req.user.branch
      : (req.query.branch || null);   // superadmin: optional filter, null = all

    // Date range for the requested day
    const targetDate = utcMidnight(req.query.date || null);
    const nextDate   = new Date(targetDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    // ── 1. All profile-complete technicians in branch ─────────────────────
    const techQuery = { role: "technician", profileComplete: true };
    if (branch) techQuery.branch = branch;

    const technicians = await User.find(techQuery)
      .select("_id name technicianId branch technicianType")
      .lean();

    if (technicians.length === 0) return res.json([]);

    const techIds = technicians.map((t) => t._id);

    // ── 2. Attendance records for that day ────────────────────────────────
    const attQuery = { date: targetDate };
    if (branch) attQuery.branch = branch;

    const attRecords = await Attendance.find(attQuery).lean();
    const attMap     = {};
    attRecords.forEach((r) => {
      attMap[r.userId.toString()] = r;
    });

    // ── 3. Entries logged that day by these technicians ───────────────────
    // Only fetches from entries collection — no mutation, read-only join.
    const entryRecords = await Entry.find({
      userId: { $in: techIds },
      date:   { $gte: targetDate, $lt: nextDate },
    })
      .select("userId category vehicleNo jcNo hoursWorked labourAmount leaveDays")
      .lean();

    const entryMap = {};
    entryRecords.forEach((e) => {
      const uid = e.userId.toString();
      if (!entryMap[uid]) entryMap[uid] = [];
      entryMap[uid].push(e);
    });

    // ── 4. Merge into response ────────────────────────────────────────────
    const result = technicians.map((tech) => {
      const uid     = tech._id.toString();
      const att     = attMap[uid] ?? null;
      const entries = entryMap[uid] ?? null;   // null = no entries that day

      return {
        technician:   tech,
        status:       att ? "present" : "absent",
        markedAt:     att?.markedAt   ?? null,
        entriesCount: entries ? entries.length : 0,
        entries,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("[Attendance] getAdminAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};