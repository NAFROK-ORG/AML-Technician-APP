const Entry = require("../models/Entry");
const User  = require("../models/User");
const { calculateIncentive } = require("../utils/incentiveCalculator");

// ─────────────────────────────────────────────
// POST /api/entries
// ─────────────────────────────────────────────
// NOTE: `incentive` is intentionally NOT accepted from the request body.
// Incentive is calculated server-side from monthly aggregates — never a
// free-text input from the technician.
const createEntry = async (req, res) => {
  try {
    const { date, category, vehicleNo, jcNo, labourAmount, hoursWorked, leaveDays } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.profileComplete)
      return res.status(400).json({ message: "Complete your profile first" });

    const entry = await Entry.create({
      userId:       req.user.userId,
      branch:       user.branch,
      date:         date || Date.now(),
      category,
      vehicleNo:    vehicleNo?.trim() || "",
      jcNo:         jcNo?.trim(),
      labourAmount: Number(labourAmount) || 0,
      hoursWorked:  Number(hoursWorked)  || 0,
      leaveDays:    Number(leaveDays)    || 0,
      // incentive field left at schema default (0); not set from input
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

// ─────────────────────────────────────────────
// GET /api/entries/my
// ─────────────────────────────────────────────
const getMyEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/entries/:id
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// GET /api/entries/my/incentive?year=2026&month=5
// ─────────────────────────────────────────────
// Aggregates all entries for the given month and returns a full
// incentive breakdown. Defaults to the current calendar month.
const getMonthlyIncentive = async (req, res) => {
  try {
    const now = new Date();
    const year  = parseInt(req.query.year,  10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1); // 1-12

    if (month < 1 || month > 12) {
      return res.status(400).json({ message: "month must be between 1 and 12" });
    }

    // Inclusive start, exclusive end — safe across all timezones
    const startDate = new Date(year, month - 1, 1);        // 1st 00:00 local
    const endDate   = new Date(year, month, 1);            // 1st of next month

    const entries = await Entry.find({
      userId: req.user.userId,
      date:   { $gte: startDate, $lt: endDate },
    });

    // Aggregate totals for the month
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
      // nextSlab already included from calculateIncentive — frontend uses it for progress bars
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createEntry, getMyEntries, deleteEntry, getMonthlyIncentive };