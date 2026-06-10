const Entry      = require("../models/Entry");
const User       = require("../models/User");
const Attendance = require("../models/Attendance");

const VALID_BRANCHES = ["BALLARI", "CHITRADURGA", "HOSPET", "RAICHUR"];

const isBranchAdmin = (req) => req.user.role === "admin";
const { normalizeVehicleNo } = require("../utils/vehicleUtils");

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: monthDateRange
// ─────────────────────────────────────────────────────────────────────────────
const monthDateRange = (yearNum, monthNum0) => ({
  from: new Date(Date.UTC(yearNum, monthNum0, 1)),
  to:   new Date(Date.UTC(yearNum, monthNum0 + 1, 1)),
});

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: parseMonthParam
// ─────────────────────────────────────────────────────────────────────────────
const parseMonthParam = (monthStr) => {
  if (monthStr) {
    const parts = monthStr.split("-");
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        return { year: y, month0: m - 1 };
      }
    }
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month0: now.getUTCMonth() };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/branches  ← SUPERADMIN ONLY
// ─────────────────────────────────────────────────────────────────────────────
const getBranches = async (req, res) => {
  try {
    const branches = await User.distinct("branch", {
      role:   "technician",
      branch: { $ne: "" },
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/branch/:branch?month=YYYY-MM
// ─────────────────────────────────────────────────────────────────────────────
const getBranchDashboard = async (req, res) => {
  try {
    const { branch } = req.params;

    if (isBranchAdmin(req) && branch !== req.user.branch) {
      return res.status(403).json({ message: "Access denied: You can only view your own branch." });
    }

    const { year, month0 } = parseMonthParam(req.query.month);
    const { from, to }     = monthDateRange(year, month0);

    const matchStage = { branch, date: { $gte: from, $lt: to } };

    const [stats] = await Entry.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id:             null,
          totalHours:      { $sum: "$hoursWorked" },
          totalLabour:     { $sum: "$labourAmount" },
          totalIncentives: { $sum: "$incentive" },
          totalLeaveDays:  { $sum: "$leaveDays" },
          totalEntries:    { $count: {} },
        },
      },
    ]);

    const categoryBreakdown = await Entry.aggregate([
      { $match: matchStage },
      { $group: { _id: "$category", count: { $count: {} } } },
      { $sort: { count: -1 } },
    ]);

    const technicianCount = await User.countDocuments({ branch, role: "technician" });

    res.json({
      branch,
      technicianCount,
      totalHours:      stats?.totalHours      || 0,
      totalLabour:     stats?.totalLabour     || 0,
      totalIncentives: stats?.totalIncentives || 0,
      totalLeaveDays:  stats?.totalLeaveDays  || 0,
      totalEntries:    stats?.totalEntries    || 0,
      avgHoursPerTechnician: technicianCount
        ? ((stats?.totalHours || 0) / technicianCount).toFixed(1)
        : 0,
      categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/branch/:branch/technicians
// FIX: was N+1 (one aggregation per technician). Now a single aggregation
//      with $in for all techIds, merged in memory. O(N) → O(1) DB calls.
// ─────────────────────────────────────────────────────────────────────────────
const getBranchTechnicians = async (req, res) => {
  try {
    const { branch } = req.params;

    if (isBranchAdmin(req) && branch !== req.user.branch) {
      return res.status(403).json({ message: "Access denied: You can only view your own branch." });
    }

    const technicians = await User
      .find({ branch, role: "technician" })
      .select("-password")
      .lean();

    if (technicians.length === 0) return res.json([]);

    const techIds = technicians.map((t) => t._id);

    // Single aggregation replaces the previous Promise.all(technicians.map(...)) loop
    const summaries = await Entry.aggregate([
      { $match: { userId: { $in: techIds } } },
      {
        $group: {
          _id:          "$userId",
          totalEntries: { $count: {} },
          totalHours:   { $sum: "$hoursWorked" },
          totalLabour:  { $sum: "$labourAmount" },
        },
      },
    ]);

    const summaryMap = new Map(summaries.map((s) => [s._id.toString(), s]));

    const result = technicians.map((tech) => {
      const s = summaryMap.get(tech._id.toString()) || {};
      return {
        id:             tech._id,
        name:           tech.name,
        technicianId:   tech.technicianId,
        email:          tech.email,
        technicianType: tech.technicianType || null,
        totalEntries:   s.totalEntries || 0,
        totalHours:     s.totalHours   || 0,
        totalLabour:    s.totalLabour  || 0,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/technician/:userId  — paginated entries
// FIX: added allTimeStats aggregation alongside the paginated fetch.
//      Frontend AdminTechnicianDetail was computing totals from the current
//      page only (20 entries), showing wrong numbers. allTimeStats fixes that.
// ─────────────────────────────────────────────────────────────────────────────
const getTechnicianEntries = async (req, res) => {
  try {
    const { userId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const targetUser = await User.findById(userId).select("-password").lean();
    if (!targetUser)
      return res.status(404).json({ message: "Technician not found" });

    if (isBranchAdmin(req) && targetUser.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This technician is not in your branch.",
      });
    }

    const [entries, total, allTimeAgg] = await Promise.all([
      Entry.find({ userId })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Entry.countDocuments({ userId }),
      Entry.aggregate([
        { $match: { userId: targetUser._id } },
        {
          $group: {
            _id:            null,
            totalHours:     { $sum: "$hoursWorked" },
            totalLabour:    { $sum: "$labourAmount" },
            totalLeave:     { $sum: "$leaveDays" },
            totalIncentive: { $sum: "$incentive" },
          },
        },
      ]),
    ]);

    const allTimeStats = allTimeAgg[0]
      ? {
          totalHours:     allTimeAgg[0].totalHours,
          totalLabour:    allTimeAgg[0].totalLabour,
          totalLeave:     allTimeAgg[0].totalLeave,
          totalIncentive: allTimeAgg[0].totalIncentive,
        }
      : { totalHours: 0, totalLabour: 0, totalLeave: 0, totalIncentive: 0 };

    res.json({
      user: targetUser,
      entries,
      total,
      page,
      pages: Math.ceil(total / limit),
      allTimeStats, // ← consumed by AdminTechnicianDetail totals strip
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/entry/:id
// FIX: incentive was never processed. Admin sets it manually after month-end.
//      It is the only path that writes a non-zero incentive to an entry document.
// ─────────────────────────────────────────────────────────────────────────────
const editEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    if (isBranchAdmin(req) && entry.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This entry does not belong to your branch.",
      });
    }

    // FIX: incentive added to destructuring and updates
    const {
      category,
      vehicleNo,
      jcNo,
      hoursWorked,
      labourAmount,
      leaveDays,
      incentive,
    } = req.body;

    const updates = {};

    if (category     !== undefined) updates.category     = category;
    if (vehicleNo    !== undefined) {
      updates.vehicleNo     = vehicleNo?.trim() || "";
      updates.vehicleNoNorm = normalizeVehicleNo(vehicleNo?.trim() || "");
    }
    if (jcNo         !== undefined) updates.jcNo         = jcNo?.trim();
    if (hoursWorked  !== undefined) updates.hoursWorked  = Number(hoursWorked)  || 0;
    if (labourAmount !== undefined) updates.labourAmount = Number(labourAmount) || 0;
    if (leaveDays    !== undefined) updates.leaveDays    = Number(leaveDays)    || 0;
    // FIX: was silently ignored before — now correctly saved
    if (incentive    !== undefined) updates.incentive    = Math.max(0, Number(incentive) || 0);

    const updated = await Entry.findByIdAndUpdate(req.params.id, updates, {
      new:           true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/entry/:id
// ─────────────────────────────────────────────────────────────────────────────
const deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    if (isBranchAdmin(req) && entry.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This entry does not belong to your branch.",
      });
    }

    await Entry.findByIdAndDelete(req.params.id);
    res.json({ message: "Entry deleted by admin" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/technician/:userId/export
// ─────────────────────────────────────────────────────────────────────────────
const exportTechnicianData = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId).select("-password").lean();
    if (!targetUser)
      return res.status(404).json({ message: "Technician not found" });

    if (isBranchAdmin(req) && targetUser.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This technician is not in your branch.",
      });
    }

    const entries = await Entry.find({ userId }).sort({ date: -1 }).lean();
    res.json({ user: targetUser, entries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// FIX: from/to query params are now validated before being passed to MongoDB.
//      Previously, new Date("abc") produced Invalid Date silently — the query
//      ran but matched nothing, returning zeros with no error to the caller.
// ─────────────────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const { from, to } = req.query;

    const branch = isBranchAdmin(req) ? req.user.branch : req.query.branch;

    const matchStage = {};
    if (branch) matchStage.branch = branch;

    if (from || to) {
      matchStage.date = {};

      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json({
            message: "Invalid 'from' date. Use YYYY-MM-DD format.",
          });
        }
        matchStage.date.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to + "T23:59:59.999Z");
        if (isNaN(toDate.getTime())) {
          return res.status(400).json({
            message: "Invalid 'to' date. Use YYYY-MM-DD format.",
          });
        }
        matchStage.date.$lte = toDate;
      }
    }

    const [overviewArr, byBranch, byCategory, byMonth, topTechs] =
      await Promise.all([

        Entry.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id:             null,
              totalLabour:     { $sum: "$labourAmount" },
              totalHours:      { $sum: "$hoursWorked" },
              totalIncentives: { $sum: "$incentive" },
              totalLeaveDays:  { $sum: "$leaveDays" },
              totalEntries:    { $sum: 1 },
            },
          },
        ]),

        Entry.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id:             "$branch",
              totalLabour:     { $sum: "$labourAmount" },
              totalHours:      { $sum: "$hoursWorked" },
              totalIncentives: { $sum: "$incentive" },
              totalEntries:    { $sum: 1 },
              totalLeaveDays:  { $sum: "$leaveDays" },
            },
          },
          { $sort: { totalLabour: -1 } },
        ]),

        Entry.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id:         "$category",
              totalLabour: { $sum: "$labourAmount" },
              totalHours:  { $sum: "$hoursWorked" },
              count:       { $sum: 1 },
            },
          },
          { $sort: { totalLabour: -1 } },
        ]),

        Entry.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                year:  { $year:  "$date" },
                month: { $month: "$date" },
              },
              totalLabour:     { $sum: "$labourAmount" },
              totalHours:      { $sum: "$hoursWorked" },
              totalIncentives: { $sum: "$incentive" },
              totalEntries:    { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
          { $limit: 12 },
        ]),

        Entry.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id:          "$userId",
              totalLabour:  { $sum: "$labourAmount" },
              totalHours:   { $sum: "$hoursWorked" },
              totalEntries: { $sum: 1 },
              branch:       { $first: "$branch" },
            },
          },
          { $sort: { totalLabour: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from:         "users",
              localField:   "_id",
              foreignField: "_id",
              as:           "userInfo",
            },
          },
          { $unwind: "$userInfo" },
          {
            $project: {
              totalLabour:  1,
              totalHours:   1,
              totalEntries: 1,
              branch:       1,
              name:         "$userInfo.name",
              technicianId: "$userInfo.technicianId",
            },
          },
        ]),
      ]);

    const MONTH_NAMES = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec",
    ];

    res.json({
      overview: overviewArr[0] || {
        totalLabour: 0, totalHours: 0, totalIncentives: 0,
        totalLeaveDays: 0, totalEntries: 0,
      },
      byBranch,
      byCategory,
      byMonth: byMonth.map((m) => ({
        label:           `${MONTH_NAMES[m._id.month - 1]} ${String(m._id.year).slice(2)}`,
        totalLabour:     m.totalLabour,
        totalHours:      m.totalHours,
        totalIncentives: m.totalIncentives,
        totalEntries:    m.totalEntries,
      })),
      topTechs,
      scopedBranch: isBranchAdmin(req) ? req.user.branch : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics fetch failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/user/:userId  ← SUPERADMIN ONLY
// ─────────────────────────────────────────────────────────────────────────────
const editUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, technicianId, branch, technicianType } = req.body;

    const VALID_TYPES = [
      "MECHANIC", "MECHANIC HELPER", "ELECTRICIAN", "ELECTRICIAN HELPER",
    ];

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "technician") {
      return res.status(403).json({
        message: "Only technician accounts can be edited via this route.",
      });
    }

    if (technicianType && !VALID_TYPES.includes(technicianType)) {
      return res.status(400).json({ message: "Invalid technician type." });
    }

    if (branch !== undefined) {
      const trimmedBranch = branch.trim();
      if (!VALID_BRANCHES.includes(trimmedBranch)) {
        return res.status(400).json({
          message: `Invalid branch. Valid options: ${VALID_BRANCHES.join(", ")}`,
        });
      }
    }

    const updates = {};
    if (name           !== undefined) updates.name           = name.trim();
    if (technicianId   !== undefined) updates.technicianId   = technicianId.trim();
    if (branch         !== undefined) updates.branch         = branch.trim();
    if (technicianType !== undefined) updates.technicianType = technicianType || null;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");

    if (updates.branch && updates.branch !== user.branch) {
      await Entry.updateMany({ userId }, { $set: { branch: updates.branch } });
      await Attendance.updateMany({ userId }, { $set: { branch: updates.branch } });
    }

    if ("technicianType" in updates && updates.technicianType !== user.technicianType) {
      await Entry.updateMany({ userId }, { $set: { technicianType: updates.technicianType } });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/user/:userId  ← SUPERADMIN ONLY
// ─────────────────────────────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "technician") {
      return res.status(403).json({
        message: "Only technician accounts can be deleted via this route.",
      });
    }

    await Entry.deleteMany({ userId });
    await Attendance.deleteMany({ userId });
    await user.deleteOne();

    res.json({ message: "Technician and all their entries have been deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getBranches,
  getBranchDashboard,
  getBranchTechnicians,
  getTechnicianEntries,
  editEntry,
  deleteEntry,
  exportTechnicianData,
  getAnalytics,
  editUser,
  deleteUser,
};