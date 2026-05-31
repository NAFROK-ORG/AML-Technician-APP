const Entry = require("../models/Entry");
const User  = require("../models/User");

/**
 * isBranchAdmin(req)
 * True if the requester is a branch-scoped admin (not superadmin).
 * Used throughout to decide whether to enforce branch filters.
 */
const isBranchAdmin = (req) => req.user.role === "admin";

// ─────────────────────────────────────────────────────────────
// GET /api/admin/branches  ← SUPERADMIN ONLY (enforced in routes)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// GET /api/admin/branch/:branch  — aggregated stats for a branch
// ─────────────────────────────────────────────────────────────
const getBranchDashboard = async (req, res) => {
  try {
    const { branch } = req.params;

    // Branch admin: the URL branch must match their own branch.
    // This prevents hitting /api/admin/branch/Mumbai when they're a Chennai admin.
    if (isBranchAdmin(req) && branch !== req.user.branch) {
      return res
        .status(403)
        .json({ message: "Access denied: You can only view your own branch." });
    }

    const [stats] = await Entry.aggregate([
      { $match: { branch } },
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
      { $match: { branch } },
      { $group: { _id: "$category", count: { $count: {} } } },
      { $sort: { count: -1 } },
    ]);

    const technicianCount = await User.countDocuments({
      branch,
      role: "technician",
    });

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

// ─────────────────────────────────────────────────────────────
// GET /api/admin/branch/:branch/technicians
// ─────────────────────────────────────────────────────────────
const getBranchTechnicians = async (req, res) => {
  try {
    const { branch } = req.params;

    // Branch admin: enforce branch match
    if (isBranchAdmin(req) && branch !== req.user.branch) {
      return res
        .status(403)
        .json({ message: "Access denied: You can only view your own branch." });
    }

    const technicians = await User.find({ branch, role: "technician" }).select("-password");

    const result = await Promise.all(
      technicians.map(async (tech) => {
        const [summary] = await Entry.aggregate([
          { $match: { userId: tech._id } },
          {
            $group: {
              _id:          null,
              totalEntries: { $count: {} },
              totalHours:   { $sum: "$hoursWorked" },
              totalLabour:  { $sum: "$labourAmount" },
            },
          },
        ]);
        return {
          id:           tech._id,
          name:         tech.name,
          technicianId: tech.technicianId,
          email:        tech.email,
          totalEntries: summary?.totalEntries || 0,
          totalHours:   summary?.totalHours   || 0,
          totalLabour:  summary?.totalLabour  || 0,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/technician/:userId  — paginated entries
// ─────────────────────────────────────────────────────────────
const getTechnicianEntries = async (req, res) => {
  try {
    const { userId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Always fetch the target user first — we need their branch for the ownership check.
    // This also means a 404 is returned immediately for invalid userIds.
    const targetUser = await User.findById(userId).select("-password");
    if (!targetUser)
      return res.status(404).json({ message: "Technician not found" });

    // Branch admin: the target technician must belong to their branch.
    // Without this check, a branch admin could access ANY technician by guessing userId.
    if (isBranchAdmin(req) && targetUser.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This technician is not in your branch.",
      });
    }

    const [entries, total] = await Promise.all([
      Entry.find({ userId })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Entry.countDocuments({ userId }),
    ]);

    res.json({
      user:  targetUser,
      entries,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/entry/:id
// ─────────────────────────────────────────────────────────────
const editEntry = async (req, res) => {
  try {
    // Fetch entry BEFORE updating — we need the branch to check ownership.
    // Never trust the branch in req.body; always read it from the DB record.
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    // Branch admin: can only edit entries that belong to their branch.
    // This stops a branch admin from editing a Chennai entry via a direct API call
    // even if they have a valid admin JWT.
    if (isBranchAdmin(req) && entry.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This entry does not belong to your branch.",
      });
    }

    const updated = await Entry.findByIdAndUpdate(req.params.id, req.body, {
      new:            true,
      runValidators:  true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/entry/:id
// ─────────────────────────────────────────────────────────────
const deleteEntry = async (req, res) => {
  try {
    // Same pattern as editEntry — read first, check branch, then delete.
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

// ─────────────────────────────────────────────────────────────
// GET /api/admin/technician/:userId/export
// ─────────────────────────────────────────────────────────────
const exportTechnicianData = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId).select("-password");
    if (!targetUser)
      return res.status(404).json({ message: "Technician not found" });

    // Branch admin: can only export technicians in their branch.
    // Without this a branch admin could export any technician's full history.
    if (isBranchAdmin(req) && targetUser.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This technician is not in your branch.",
      });
    }

    const entries = await Entry.find({ userId }).sort({ date: -1 });
    res.json({ user: targetUser, entries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// ─────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const { from, to } = req.query;

    /**
     * Branch scoping decision:
     *
     * Superadmin → can optionally filter by branch via ?branch= query param (or see all).
     * Branch admin → branch is ALWAYS forced to req.user.branch.
     *   The query param is intentionally ignored — a branch admin must never
     *   be able to pass ?branch=Mumbai and see another branch's data.
     */
    const branch = isBranchAdmin(req) ? req.user.branch : req.query.branch;

    const matchStage = {};
    if (branch) matchStage.branch = branch;
    if (from || to) {
      matchStage.date = {};
      if (from) matchStage.date.$gte = new Date(from);
      if (to)   matchStage.date.$lte = new Date(to + "T23:59:59.999Z");
    }

    const [overviewArr, byBranch, byCategory, byMonth, topTechs] =
      await Promise.all([

        // 1. Overall totals
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

        // 2. Per-branch breakdown
        // For branch admin this will always be a single-item array (their branch only).
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

        // 3. Per-category breakdown
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

        // 4. Monthly trend (last 12 months)
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

        // 5. Top 10 technicians by labour (already scoped by matchStage.branch)
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

      /**
       * scopedBranch is sent back to the frontend so components can know
       * whether they're in branch-admin mode without rechecking user.role.
       * null  → superadmin (no scope, all data)
       * string → branch admin (scoped to this branch)
       */
      scopedBranch: isBranchAdmin(req) ? req.user.branch : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics fetch failed" });
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
};