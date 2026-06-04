const Entry      = require("../models/Entry");
const User       = require("../models/User");
const Attendance = require("../models/Attendance"); // FIX Bug 1: needed for server-side attendance gate
const { calculateIncentive } = require("../utils/incentiveCalculator");

// ─── Helper: UTC midnight ─────────────────────────────────────────────────────
// Mirrors the identical helper in attendanceController so the date comparison
// always hits the exact same bucket the Attendance document was stored under.
// Both helpers must produce the same value for the same calendar day.
function utcMidnight(input) {
  const d = input ? new Date(input) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── POST /api/entries ────────────────────────────────────────────────────────
const createEntry = async (req, res) => {
  try {
    // FIX Bug 4: `date` is intentionally NOT read from req.body.
    // Date is always assigned server-side (new Date()) so technicians cannot:
    //   - Backdate entries to days their attendance was not marked
    //   - Forward-date entries into a future quarter to game the incentive
    const { category, vehicleNo, jcNo, labourAmount, hoursWorked, leaveDays } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.profileComplete)
      return res.status(400).json({ message: "Complete your profile first" });

    // Guard: technicianType must be set before any entry can be logged.
    // This is backend enforcement of the frontend freeze.
    if (!user.technicianType)
      return res.status(403).json({
        message: "Please select your technician type before logging entries.",
      });

    // ── FIX Bug 1: Server-side attendance gate ────────────────────────────────
    // The frontend overlay + disabled button is UX-only. Any direct API call
    // (curl, Postman, browser devtools) bypasses the frontend entirely.
    // This check enforces the attendance rule at the data layer regardless of
    // how the request arrives.
    const today   = utcMidnight();
    const attended = await Attendance.findOne({ userId: req.user.userId, date: today });
    if (!attended) {
      return res.status(403).json({
        message: "Mark your attendance for today before logging job card entries.",
      });
    }

    // ── FIX Bug 8: Numeric bounds validation ──────────────────────────────────
    // Parse first, then validate. This prevents NaN surprises and catches
    // obviously wrong values before they reach the DB or skew incentive
    // calculations (e.g. hoursWorked: 9999 would instantly hit Slab 3).
    const parsedHours  = Number(hoursWorked)  || 0;
    const parsedLabour = Number(labourAmount) || 0;
    const parsedLeave  = Number(leaveDays)    || 0;

    if (parsedHours < 0 || parsedHours > 24) {
      return res.status(400).json({
        message: "hoursWorked must be between 0 and 24.",
      });
    }
    if (parsedLabour < 0 || parsedLabour > 100000) {
      return res.status(400).json({
        message: "labourAmount must be between ₹0 and ₹1,00,000.",
      });
    }
    if (parsedLeave < 0 || parsedLeave > 31) {
      return res.status(400).json({
        message: "leaveDays must be between 0 and 31.",
      });
    }

    const entry = await Entry.create({
      userId:         req.user.userId,
      branch:         user.branch,
      technicianType: user.technicianType, // copied from user — never from req.body
      date:           new Date(),           // FIX Bug 4: always server-side timestamp
      category,
      vehicleNo:      vehicleNo?.trim() || "",
      jcNo:           jcNo?.trim(),
      labourAmount:   parsedLabour,
      hoursWorked:    parsedHours,
      leaveDays:      parsedLeave,
      // incentive intentionally omitted — always computed server-side on demand
    });

    res.status(201).json(entry);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/entries/my ──────────────────────────────────────────────────────
// NOTE: This returns all entries for the technician without pagination.
// The TechnicianDashboard relies on the full list for client-side monthly stat
// computation (thisMonthEntries). Pagination here requires moving those stat
// calculations to a dedicated server-side endpoint — deferred to a future task.
const getMyEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/entries/:id ──────────────────────────────────────────────────
const deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    if (String(entry.userId) !== String(req.user.userId))
      return res.status(403).json({ message: "Not authorized to delete this entry" });

    await entry.deleteOne();
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/entries/my/incentive?year=2026&month=5 ─────────────────────────
const getMonthlyIncentive = async (req, res) => {
  try {
    const now   = new Date();
    const year  = parseInt(req.query.year,  10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    if (month < 1 || month > 12)
      return res.status(400).json({ message: "month must be between 1 and 12" });

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month,     1);

    const entries = await Entry.find({
      userId: req.user.userId,
      date:   { $gte: startDate, $lt: endDate },
    });

    const totalHours  = entries.reduce((s, e) => s + (e.hoursWorked  || 0), 0);
    const totalLabour = entries.reduce((s, e) => s + (e.labourAmount || 0), 0);
    const totalLeave  = entries.reduce((s, e) => s + (e.leaveDays    || 0), 0);

    const breakdown = calculateIncentive(totalHours, totalLabour, totalLeave);

    res.json({
      year,
      month,
      entryCount: entries.length,
      totalHours,
      totalLabour,
      totalLeave,
      ...breakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createEntry, getMyEntries, deleteEntry, getMonthlyIncentive };