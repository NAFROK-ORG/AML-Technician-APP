const Entry = require("../models/Entry");
const User  = require("../models/User");
const { calculateIncentive } = require("../utils/incentiveCalculator");

// ─── POST /api/entries ────────────────────────────────────────────────────────
const createEntry = async (req, res) => {
  try {
    const { date, category, vehicleNo, jcNo, labourAmount, hoursWorked, leaveDays } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.profileComplete)
      return res.status(400).json({ message: "Complete your profile first" });

    // Guard: technicianType must be set before any entry can be logged.
    // This is the backend enforcement of the frontend freeze.
    // Even if the frontend is bypassed (direct API call), this blocks entry creation.
    if (!user.technicianType)
      return res.status(403).json({
        message: "Please select your technician type before logging entries.",
      });

    const entry = await Entry.create({
      userId:         req.user.userId,
      branch:         user.branch,
      technicianType: user.technicianType, // copied from user — never from req.body
      date:           date || Date.now(),
      category,
      vehicleNo:      vehicleNo?.trim() || "",
      jcNo:           jcNo?.trim(),
      labourAmount:   Number(labourAmount) || 0,
      hoursWorked:    Number(hoursWorked)  || 0,
      leaveDays:      Number(leaveDays)    || 0,
      // incentive is intentionally omitted — always computed server-side
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