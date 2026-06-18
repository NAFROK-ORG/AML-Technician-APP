const Entry      = require("../models/Entry");
const User       = require("../models/User");
const Attendance = require("../models/Attendance");
const { writeAuditLog } = require("../utils/auditLogger"); // ADD — needed for editMyEntry audit
const { calculateIncentive }  = require("../utils/incentiveCalculator");
const { normalizeVehicleNo }  = require("../utils/vehicleUtils");

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

    if (!vehicleNo || !vehicleNo.trim()) {
      return res.status(400).json({ message: "Vehicle number is required" });
    }

    const vehicleNoNorm = normalizeVehicleNo(vehicleNo);

    const parsedHours  = Number(hoursWorked)  || 0;
    const parsedLabour = Number(labourAmount) || 0;
    const parsedLeave  = Number(leaveDays)    || 0;

    if (parsedHours < 0 || parsedHours > 24)
      return res.status(400).json({ message: "hoursWorked must be between 0 and 24." });
    if (parsedLabour < 0 || parsedLabour > 100000)
      return res.status(400).json({ message: "labourAmount must be between ₹0 and ₹1,00,000." });
    if (parsedLeave < 0 || parsedLeave > 31)
      return res.status(400).json({ message: "leaveDays must be between 0 and 31." });

    const entry = await Entry.create({
      userId:         req.user.userId,
      branch:         user.branch,
      technicianType: user.technicianType,
      date:           new Date(),
      category,
      vehicleNo:      vehicleNo.trim(),
      vehicleNoNorm,
      jcNo:           jcNo?.trim(),
      labourAmount:   parsedLabour,
      hoursWorked:    parsedHours,
      leaveDays:      parsedLeave,
      // NOTE: incentive is always 0 at create time.
      // It is a monthly aggregate value, not per-entry.
      // Admins set it manually via PUT /api/admin/entry/:id after month-end.
      // The live incentive display uses GET /api/entries/my/incentive (on-the-fly calc).
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

const getMyEntries = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page,  10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    // ── Optional month scope ──────────────────────────────────────
    const filter = { userId: req.user.userId };
    const yearParam  = parseInt(req.query.year,  10);
    const monthParam = parseInt(req.query.month, 10);

    if (yearParam && monthParam && monthParam >= 1 && monthParam <= 12) {
      filter.date = {
        $gte: new Date(Date.UTC(yearParam, monthParam - 1, 1)),
        $lt:  new Date(Date.UTC(yearParam, monthParam,     1)),
      };
    }
    // ─────────────────────────────────────────────────────────────

    const [entries, total] = await Promise.all([
      Entry.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Entry.countDocuments(filter),
    ]);

    res.json({ entries, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// REMOVED (Audit System Phase 2): deleteEntry (DELETE /api/entries/:id)
// Technicians can no longer delete their own entries via any path.
// Route removed from entryRoutes.js as well.

// ─── GET /api/entries/my/incentive ───────────────────────────────────────────
const getMonthlyIncentive = async (req, res) => {
  try {
    const now   = new Date();
    const year  = parseInt(req.query.year,  10) || now.getUTCFullYear();
    const month = parseInt(req.query.month, 10) || (now.getUTCMonth() + 1);

    if (month < 1 || month > 12)
      return res.status(400).json({ message: "month must be between 1 and 12" });

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate   = new Date(Date.UTC(year, month,     1));

    const [entries, user] = await Promise.all([
      Entry.find({
        userId: req.user.userId,
        date:   { $gte: startDate, $lt: endDate },
      }).lean(),
      User.findById(req.user.userId).select("technicianType").lean(),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    const totalHours    = entries.reduce((s, e) => s + (e.hoursWorked  || 0), 0);
    const totalLabour   = entries.reduce((s, e) => s + (e.labourAmount || 0), 0);
    const totalLeave    = entries.reduce((s, e) => s + (e.leaveDays    || 0), 0);

    const totalVehicles = new Set(
      entries.map((e) => e.vehicleNo).filter(Boolean)
    ).size;

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
      totalVehicles,
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

    if (String(entry.userId) !== String(req.user.userId))
      return res.status(403).json({ message: "Not authorized to edit this entry" });

    // ── AUDIT: Snapshot captured AFTER ownership check, BEFORE any mutation ──
    // toObject() gives a plain JS object — not a Mongoose doc — so mutations
    // to `entry` below will NOT retroactively affect this snapshot.
    const oldSnapshot = entry.toObject();
    // ─────────────────────────────────────────────────────────────────────────

    const { category, vehicleNo, jcNo, hoursWorked, labourAmount, leaveDays, date } = req.body;

    const parsedHours  = hoursWorked  !== undefined ? Number(hoursWorked)  : entry.hoursWorked;
    const parsedLabour = labourAmount !== undefined ? Number(labourAmount) : entry.labourAmount;
    const parsedLeave  = leaveDays    !== undefined ? Number(leaveDays)    : entry.leaveDays;

    if (parsedHours < 0 || parsedHours > 24)
      return res.status(400).json({ message: "hoursWorked must be between 0 and 24." });
    if (parsedLabour < 0 || parsedLabour > 100000)
      return res.status(400).json({ message: "labourAmount must be between ₹0 and ₹1,00,000." });
    if (parsedLeave < 0 || parsedLeave > 31)
      return res.status(400).json({ message: "leaveDays must be between 0 and 31." });

    if (jcNo !== undefined && !jcNo?.trim())
      return res.status(400).json({ message: "Job Card No cannot be empty." });

    if (date !== undefined) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime()))
        return res.status(400).json({ message: "Invalid date." });

      const now = new Date();
      if (newDate > now)
        return res.status(400).json({ message: "Date cannot be in the future." });

      const startOfCurrentMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      if (newDate < startOfCurrentMonth)
        return res.status(400).json({
          message: "Date must be within the current month.",
        });

      entry.date = newDate;
    }

    if (category  !== undefined) entry.category = category;
    if (jcNo      !== undefined) entry.jcNo     = jcNo.trim();

    if (vehicleNo !== undefined) {
      entry.vehicleNo     = vehicleNo?.trim() || "";
      entry.vehicleNoNorm = normalizeVehicleNo(vehicleNo);
    }

    entry.hoursWorked  = parsedHours;
    entry.labourAmount = parsedLabour;
    entry.leaveDays    = parsedLeave;

    await entry.save();

    // ── AUDIT: Compute field-level diff and write log ─────────────────────
    // Only runs if at least one field actually changed value.
    // Mirrors the same pattern used in adminController editEntry.
    // Uses String() coercion so 0 vs "0" doesn't produce false positives.
    // Date is compared via ISO string so timezone-neutral.
    const AUDITABLE_FIELDS = [
      "category", "vehicleNo", "jcNo",
      "hoursWorked", "labourAmount", "leaveDays", "date",
    ];

    const changedFields = {};
    AUDITABLE_FIELDS.forEach((field) => {
      const oldVal = field === "date"
        ? (oldSnapshot[field] ? new Date(oldSnapshot[field]).toISOString() : "")
        : String(oldSnapshot[field] ?? "");
      const newVal = field === "date"
        ? (entry[field] ? new Date(entry[field]).toISOString() : "")
        : String(entry[field] ?? "");

      if (oldVal !== newVal) {
        changedFields[field] = { from: oldSnapshot[field], to: entry[field] };
      }
    });

    if (Object.keys(changedFields).length > 0) {
      // Fetch the technician's own user doc for the audit record.
      // req.user.name is already available from protect() middleware,
      // but we need technicianId too — so a lean DB fetch is necessary.
      const techUser = await User.findById(req.user.userId)
        .select("name technicianId")
        .lean();

      await writeAuditLog({
        action:        "EDIT_ENTRY_SELF",
        req,
        entrySnapshot: oldSnapshot,
        changes:       changedFields,
        targetUser:    techUser, // technician is both actor and target here
      });
    }
    // ─────────────────────────────────────────────────────────────────────

    res.json({ message: "Entry updated", entry });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: err.message });
  }
};
module.exports = { createEntry, getMyEntries, getMonthlyIncentive, editMyEntry };