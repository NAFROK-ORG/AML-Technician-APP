const Entry = require("../models/Entry");
const User = require("../models/User");

// POST /api/entries
const createEntry = async (req, res) => {
  try {
    const { date, category, vehicleNo, jcNo, labourAmount, hoursWorked, leaveDays, incentive } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.profileComplete)
      return res.status(400).json({ message: "Complete your profile first" });

    // FIX: Explicitly parse numbers — req.body values from JSON can be strings
    const entry = await Entry.create({
      userId: req.user.userId,
      branch: user.branch,
      date: date || Date.now(),
      category,
      vehicleNo: vehicleNo?.trim() || "",
      jcNo: jcNo?.trim(),
      labourAmount: Number(labourAmount) || 0,
      hoursWorked: Number(hoursWorked) || 0,
      leaveDays: Number(leaveDays) || 0,
      incentive: Number(incentive) || 0,
    });

    res.status(201).json(entry);
  } catch (err) {
    // FIX: Return Mongoose validation errors clearly to frontend
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/entries/my
const getMyEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/entries/:id
const deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    // FIX: Compare both as strings reliably
    if (String(entry.userId) !== String(req.user.userId))
      return res.status(403).json({ message: "Not authorized to delete this entry" });

    await entry.deleteOne();
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createEntry, getMyEntries, deleteEntry };
