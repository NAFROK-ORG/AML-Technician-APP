const Entry      = require("../models/Entry");
const User       = require("../models/User");
const Attendance = require("../models/Attendance");
const { calculateIncentive }  = require("../utils/incentiveCalculator");
const { normalizeVehicleNo }  = require("../utils/vehicleUtils"); // ← NEW

// ─── Helper: UTC midnight ─────────────────────────────────────────────────────
function utcMidnight(input) {
  const d = input ? new Date(input) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── POST /api/entries ────────────────────────────────────────────────────────
const createEntry = async (req, res) => {
  try {
    const { category, vehicleNo, jcNo, labourAmount, hoursWorked, leaveDays } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.profileComplete)
      return res.status(400).json({ message: "Complete your profile first" });

    if (!user.technicianType)
      return res.status(403).json({
        message: "Please select your technician type before logging entries.",
      });

    // Server-side attendance gate
    const today    = utcMidnight();
    const attended = await Attendance.findOne({ userId: req.user.userId, date: today });
    if (!attended) {
      return res.status(403).json({
        message: "Mark your attendance for today before logging job card entries.",
      });
    }

    // ── CHANGE: vehicleNo is now required for new entries ─────────────────────
    // Old entries (no vehicleNo) are unaffected — this check only runs here,
    // in the create path. Old documents in MongoDB are never touched.
    // This is the intended behavior change: linking requires a vehicle number.
    if (!vehicleNo || !vehicleNo.trim()) {
      return res.status(400).json({ message: "Vehicle number is required" });
    }

    // ── CHANGE: compute vehicleNoNorm before saving ───────────────────────────
    // normalizeVehicleNo strips hyphens/spaces and uppercases.
    // "KA-01-AB-1234" → "KA01AB1234"
    // This normalized value is what the SecurityLog linking algorithm queries.
    const vehicleNoNorm = normalizeVehicleNo(vehicleNo);
    // ─────────────────────────────────────────────────────────────────────────

    const parsedHours  = Number(hoursWorked)  || 0;
    const parsedLabour = Number(labourAmount) || 0;
    const parsedLeave  = Number(leaveDays)    || 0;

    if (parsedHours < 0 || parsedHours > 24) {
      return res.status(400).json({ message: "hoursWorked must be between 0 and 24." });
    }
    if (parsedLabour < 0 || parsedLabour > 100000) {
      return res.status(400).json({ message: "labourAmount must be between ₹0 and ₹1,00,000." });
    }
    if (parsedLeave < 0 || parsedLeave > 31) {
      return res.status(400).json({ message: "leaveDays must be between 0 and 31." });
    }

    const entry = await Entry.create({
      userId:         req.user.userId,
      branch:         user.branch,
      technicianType: user.technicianType,
      date:           new Date(),
      category,
      vehicleNo:      vehicleNo.trim(),
      vehicleNoNorm,              // ← NEW — stored for linking algorithm
      jcNo:           jcNo?.trim(),
      labourAmount:   parsedLabour,
      hoursWorked:    parsedHours,
      leaveDays:      parsedLeave,
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

// ─── GET /api/entries/my/incentive ───────────────────────────────────────────
const getMonthlyIncentive = async (req, res) => {
  try {
    const now   = new Date();
    const year  = parseInt(req.query.year,  10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    if (month < 1 || month > 12)
      return res.status(400).json({ message: "month must be between 1 and 12" });

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month,     1);

    const [entries, user] = await Promise.all([
      Entry.find({
        userId: req.user.userId,
        date:   { $gte: startDate, $lt: endDate },
      }),
      User.findById(req.user.userId).select("technicianType"),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    const totalHours  = entries.reduce((s, e) => s + (e.hoursWorked  || 0), 0);
    const totalLabour = entries.reduce((s, e) => s + (e.labourAmount || 0), 0);
    const totalLeave  = entries.reduce((s, e) => s + (e.leaveDays    || 0), 0);

    const breakdown = calculateIncentive(
      totalHours,
      totalLabour,
      totalLeave,
      user.technicianType
    );

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

// ─── PUT /api/entries/:id ─────────────────────────────────────────────────────
const editMyEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    if (String(entry.userId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Not authorized to edit this entry" });
    }

    const { category, vehicleNo, jcNo, hoursWorked, labourAmount, leaveDays, date } = req.body;

    const parsedHours  = hoursWorked  !== undefined ? Number(hoursWorked)  : entry.hoursWorked;
    const parsedLabour = labourAmount !== undefined ? Number(labourAmount) : entry.labourAmount;
    const parsedLeave  = leaveDays    !== undefined ? Number(leaveDays)    : entry.leaveDays;

    if (parsedHours < 0 || parsedHours > 24) {
      return res.status(400).json({ message: "hoursWorked must be between 0 and 24." });
    }
    if (parsedLabour < 0 || parsedLabour > 100000) {
      return res.status(400).json({ message: "labourAmount must be between ₹0 and ₹1,00,000." });
    }
    if (parsedLeave < 0 || parsedLeave > 31) {
      return res.status(400).json({ message: "leaveDays must be between 0 and 31." });
    }

    if (jcNo !== undefined && !jcNo?.trim()) {
      return res.status(400).json({ message: "Job Card No cannot be empty." });
    }

    if (category  !== undefined) entry.category    = category;
    if (jcNo      !== undefined) entry.jcNo        = jcNo.trim();
    if (date      !== undefined) entry.date        = new Date(date);

    // ── CHANGE: vehicleNo edit also updates vehicleNoNorm ────────────────────
    // If an entry's vehicleNo changes, the normalized form must change too.
    // Skipping this would silently break all future linking for this entry.
    if (vehicleNo !== undefined) {
      entry.vehicleNo     = vehicleNo?.trim() || "";
      entry.vehicleNoNorm = normalizeVehicleNo(vehicleNo); // ← CRITICAL
    }
    // ─────────────────────────────────────────────────────────────────────────

    entry.hoursWorked  = parsedHours;
    entry.labourAmount = parsedLabour;
    entry.leaveDays    = parsedLeave;

    await entry.save();
    res.json({ message: "Entry updated", entry });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createEntry, getMyEntries, deleteEntry, getMonthlyIncentive, editMyEntry };