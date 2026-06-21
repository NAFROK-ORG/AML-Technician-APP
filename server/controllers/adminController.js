const Entry       = require("../models/Entry");
const User        = require("../models/User");
const Attendance  = require("../models/Attendance");
const SecurityLog = require("../models/SecurityLog");
const { writeAuditLog } = require("../utils/auditLogger");
const { getOrSet } = require("../utils/cache");

const { VALID_BRANCHES } = require("../utils/constants");

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
// UTILITY: utcMidnight — mirrors securityController.js exactly. Kept local
// (not shared) to avoid a circular require between the two controllers. If
// this ever drifts from securityController's version, that's a real bug —
// they must stay byte-for-byte identical in behavior.
// ─────────────────────────────────────────────────────────────────────────────
function utcMidnight(input) {
  const d = input ? new Date(input) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
//
// CACHED: this aggregation runs on every dashboard load (and again on any
// poll/refresh). 30s TTL means repeated/concurrent loads for the same
// branch+month within that window are served from memory instead of
// re-running the aggregation against M0. Cache key includes branch+year+
// month0, so different branches/months never collide or serve stale data
// for each other.
// ─────────────────────────────────────────────────────────────────────────────
const getBranchDashboard = async (req, res) => {
  try {
    const { branch } = req.params;

    if (isBranchAdmin(req) && branch !== req.user.branch) {
      return res.status(403).json({ message: "Access denied: You can only view your own branch." });
    }

    const { year, month0 } = parseMonthParam(req.query.month);
    const cacheKey = `branchDashboard:${branch}:${year}-${month0}`;

    const payload = await getOrSet(cacheKey, 30, async () => {
      const { from, to } = monthDateRange(year, month0);
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

      return {
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
      };
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/branch/:branch/technicians?month=YYYY-MM
// ─────────────────────────────────────────────────────────────────────────────
const getBranchTechnicians = async (req, res) => {
  try {
    const { branch } = req.params;

    if (isBranchAdmin(req) && branch !== req.user.branch) {
      return res.status(403).json({ message: "Access denied: You can only view your own branch." });
    }

    const { year, month0 } = parseMonthParam(req.query.month);
    const cacheKey = `branchTechnicians:${branch}:${year}-${month0}`;

    const result = await getOrSet(cacheKey, 30, async () => {
      const { from, to } = monthDateRange(year, month0);

      const technicians = await User
        .find({ branch, role: "technician" })
        .select("-password")
        .lean();

      if (technicians.length === 0) return [];

      const techIds = technicians.map((t) => t._id);

      const summaries = await Entry.aggregate([
        {
          $match: {
            userId: { $in: techIds },
            date:   { $gte: from, $lt: to },
          },
        },
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

      return technicians.map((tech) => {
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
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/technician/:userId  — paginated entries
//
// NEW: Accepts optional ?vehicleNo=<query> for in-page vehicle number search.
//   - Applies a flexible regex filter (handles KA-01-AB-1234 vs KA01AB1234)
//   - Pagination runs on top of the filtered result set
//   - allTimeStats is ALWAYS unfiltered (full technician totals, invariant)
//   - filteredStats is returned only when vehicleNo search is active (null otherwise)
//   - vehicleQuery echoed back so the client knows what the backend received
// ─────────────────────────────────────────────────────────────────────────────
const getTechnicianEntries = async (req, res) => {
  try {
    const { userId } = req.params;
    const page       = parseInt(req.query.page)  || 1;
    const limit      = parseInt(req.query.limit) || 20;

    // ── Parse optional vehicle search param ──────────────────────
    const vehicleRaw      = (req.query.vehicleNo || "").trim();
    const isVehicleSearch = vehicleRaw.length >= 2;

    const targetUser = await User.findById(userId).select("-password").lean();
    if (!targetUser)
      return res.status(404).json({ message: "Technician not found" });

    if (isBranchAdmin(req) && targetUser.branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: This technician is not in your branch.",
      });
    }

    // ── Build filters ─────────────────────────────────────────────
    // queryFilter: used with find() + countDocuments()
    //   Mongoose coerces string userId → ObjectId here, so string is safe.
    const queryFilter = { userId };

    // filteredAggFilter: used inside aggregate() $match
    //   Mongoose does NOT auto-cast in aggregation — must pass ObjectId explicitly.
    let filteredAggFilter = null;

    if (isVehicleSearch) {
      // Strip hyphens/spaces from query, build flexible regex that
      // matches the number with or without separators — mirrors searchController.
      const cleaned     = vehicleRaw.replace(/[\s-]/g, "");
      const flexPattern = cleaned.split("").join("[\\s-]*");
      const vehicleRegex = { $regex: flexPattern, $options: "i" };

      queryFilter.vehicleNo  = vehicleRegex;
      filteredAggFilter      = { userId: targetUser._id, vehicleNo: vehicleRegex };
    }

    // ── Run all DB ops in parallel ────────────────────────────────
    const [entries, total, allTimeAgg, filteredAgg] = await Promise.all([
      Entry.find(queryFilter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Entry.countDocuments(queryFilter),

      // allTimeStats — NEVER filtered by vehicle (always the full picture)
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

      // filteredStats — only runs when vehicle search is active
      isVehicleSearch
        ? Entry.aggregate([
            { $match: filteredAggFilter },
            {
              $group: {
                _id:            null,
                totalHours:     { $sum: "$hoursWorked" },
                totalLabour:    { $sum: "$labourAmount" },
                totalLeave:     { $sum: "$leaveDays" },
                totalIncentive: { $sum: "$incentive" },
              },
            },
          ])
        : Promise.resolve(null),
    ]);

    // ── Shape allTimeStats ────────────────────────────────────────
    const allTimeStats = allTimeAgg[0]
      ? {
          totalHours:     allTimeAgg[0].totalHours,
          totalLabour:    allTimeAgg[0].totalLabour,
          totalLeave:     allTimeAgg[0].totalLeave,
          totalIncentive: allTimeAgg[0].totalIncentive,
        }
      : { totalHours: 0, totalLabour: 0, totalLeave: 0, totalIncentive: 0 };

    // ── Shape filteredStats (null when not searching) ─────────────
    const filteredStats = isVehicleSearch
      ? (filteredAgg?.[0]
          ? {
              totalHours:     filteredAgg[0].totalHours,
              totalLabour:    filteredAgg[0].totalLabour,
              totalLeave:     filteredAgg[0].totalLeave,
              totalIncentive: filteredAgg[0].totalIncentive,
            }
          : { totalHours: 0, totalLabour: 0, totalLeave: 0, totalIncentive: 0 }
        )
      : null;

    res.json({
      user:         targetUser,
      entries,
      total,
      page,
      pages:        Math.ceil(total / limit),
      allTimeStats,
      filteredStats,                                    // null when no search active
      vehicleQuery: isVehicleSearch ? vehicleRaw : "", // echoed back for client
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/entry/:id
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

    const {
      category, vehicleNo, jcNo,
      hoursWorked, labourAmount, leaveDays, incentive,
    } = req.body;

    const oldSnapshot = entry.toObject();
    const updates     = {};

    if (category     !== undefined) updates.category     = category;
    if (vehicleNo    !== undefined) {
      updates.vehicleNo     = vehicleNo?.trim() || "";
      updates.vehicleNoNorm = normalizeVehicleNo(vehicleNo?.trim() || "");
    }
    if (jcNo         !== undefined) updates.jcNo         = jcNo?.trim();
    if (hoursWorked  !== undefined) updates.hoursWorked  = Number(hoursWorked)  || 0;
    if (labourAmount !== undefined) updates.labourAmount = Number(labourAmount) || 0;
    if (leaveDays    !== undefined) updates.leaveDays    = Number(leaveDays)    || 0;
    if (incentive    !== undefined) updates.incentive    = Math.max(0, Number(incentive) || 0);

    const updated = await Entry.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });

    const changedFields = {};
    ["category", "vehicleNo", "jcNo", "hoursWorked", "labourAmount", "leaveDays", "incentive"]
      .forEach((field) => {
        if (field in updates && String(oldSnapshot[field]) !== String(updated[field])) {
          changedFields[field] = { from: oldSnapshot[field], to: updated[field] };
        }
      });

    if (Object.keys(changedFields).length > 0) {
      const techUser = await User.findById(entry.userId).select("name technicianId").lean();
      await writeAuditLog({
        action:        "EDIT_ENTRY",
        req,
        entrySnapshot: oldSnapshot,
        changes:       changedFields,
        targetUser:    techUser,
      });
    }

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

    const snapshot = entry.toObject();
    const techUser = await User.findById(entry.userId).select("name technicianId").lean();

    await Entry.findByIdAndDelete(req.params.id);

    await writeAuditLog({
      action:        "DELETE_ENTRY",
      req,
      entrySnapshot: snapshot,
      changes:       null,
      targetUser:    techUser,
    });

    res.json({ message: "Entry deleted by admin" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/technician/:userId/export
// ─────────────────────────────────────────────────────────────────────────────
const EXPORT_LIMIT = 5000;

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

    // Count first — avoids loading the full set just to check size
    const totalCount = await Entry.countDocuments({ userId });
    const truncated  = totalCount > EXPORT_LIMIT;

    const entries = await Entry
      .find({ userId })
      .sort({ date: -1 })
      .limit(EXPORT_LIMIT)
      .lean();

    res.json({ user: targetUser, entries, truncated, totalCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
//
// CACHED: the heaviest read in the system — 5 aggregations running in
// parallel, including a $lookup. Cache collapses repeated/concurrent loads
// for the same branch+date-range filter combination.
//
// TTL is now adaptive:
//   - Current/live queries (no 'to', or 'to' is today or future): 30s
//     These need to reflect new job card entries as they come in.
//   - Historical queries ('to' is strictly before today): 300s (5 min)
//     Past data is frozen. Re-running 5 aggregations every 30s on a
//     Q1 date range at quarter-end is wasted M0 compute. A 5-minute
//     cache means the first hit pays the cost; everything after is instant.
//
// Cache key is now explicit and deterministic — no JSON.stringify on a
// matchStage object (opaque, hard to debug, fragile if construction order
// ever changes). Key components:
//   branch   — "all" for superadmin with no filter, actual branch otherwise
//   from/to  — raw query strings (empty string when absent)
// Any change to inputs produces a different key. Same inputs always produce
// the same key. Branches/date-ranges never collide with each other.
//
// Date validation still runs BEFORE the cache wrapper — an invalid date
// returns 400 immediately and is never cached.
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
        if (isNaN(fromDate.getTime()))
          return res.status(400).json({ message: "Invalid 'from' date. Use YYYY-MM-DD format." });
        matchStage.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to + "T23:59:59.999Z");
        if (isNaN(toDate.getTime()))
          return res.status(400).json({ message: "Invalid 'to' date. Use YYYY-MM-DD format." });
        matchStage.date.$lte = toDate;
      }
    }

    // ── Deterministic cache key ────────────────────────────────────────────
    // Uses the resolved branch string and the raw query params directly.
    // "all" when superadmin has no branch filter applied.
    // Empty string ("") when from/to are absent — still produces a unique,
    // consistent key that distinguishes "no date filter" from "any date filter".
    const resolvedBranch = branch || "all";
    const cacheKey = `analytics:${resolvedBranch}:${from || ""}:${to || ""}`;

    // ── Adaptive TTL ───────────────────────────────────────────────────────
    // Historical = 'to' date is strictly before the start of today (UTC).
    // If 'to' is absent, the query spans up to "now" and is treated as live.
    // If 'to' is today or in the future, treat as live (30s).
    //
    // todayUTCMidnight: start of today in UTC — safe cross-timezone boundary.
    const todayUTCMidnight = new Date();
    todayUTCMidnight.setUTCHours(0, 0, 0, 0);

    const isHistorical = Boolean(to) &&
      new Date(to + "T23:59:59.999Z") < todayUTCMidnight;

    const ttlSeconds = isHistorical ? 300 : 30;
    // 300s for past quarter/month reports — data is frozen, no need to re-run
    //  30s for live/current views — reflects entries as they come in

    const payload = await getOrSet(cacheKey, ttlSeconds, async () => {
const [overviewArr, byBranch, byCategory, byMonth, topTechs, vehicleLogCount, vehiclesByMonth, vehiclesByBranch] =
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
        // ── Vehicle gate counts — same branch+date filter, SecurityLog ──────
          // SecurityLog.date is utcMidnight, same shape as Entry.date — matchStage works as-is.
          // Both run in parallel inside the existing cache wrapper, zero latency added.
          SecurityLog.countDocuments(matchStage),
       SecurityLog.aggregate([
            { $match: matchStage },
            {
              $group: {
                _id: { year: { $year: "$date" }, month: { $month: "$date" } },
                totalLogged: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 12 },
          ]),
          // ── Vehicle gate counts BY BRANCH — mirrors the Entry byBranch query ──
          SecurityLog.aggregate([
            { $match: matchStage },
            { $group: { _id: "$branch", totalVehiclesLogged: { $sum: 1 } } },
            { $sort: { totalVehiclesLogged: -1 } },
          ]),
        ]);
    const MONTH_NAMES = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec",
      ];

      // ── Merge byMonth: union of months present in Entry OR SecurityLog ──────
      // A month that only has vehicle logs (no job-card entries yet — e.g. a
      // brand-new branch) used to be invisible on this chart. Building from
      // both sources fixes that.
      const monthMap = new Map();

      for (const m of byMonth) {
        const key = `${m._id.year}-${m._id.month}`;
        monthMap.set(key, {
          year: m._id.year, month: m._id.month,
          totalLabour: m.totalLabour, totalHours: m.totalHours,
          totalIncentives: m.totalIncentives, totalEntries: m.totalEntries,
          totalVehiclesLogged: 0,
        });
      }
      for (const v of vehiclesByMonth) {
        const key = `${v._id.year}-${v._id.month}`;
        if (monthMap.has(key)) {
          monthMap.get(key).totalVehiclesLogged = v.totalLogged;
        } else {
          monthMap.set(key, {
            year: v._id.year, month: v._id.month,
            totalLabour: 0, totalHours: 0, totalIncentives: 0, totalEntries: 0,
            totalVehiclesLogged: v.totalLogged,
          });
        }
      }

      const mergedByMonth = [...monthMap.values()]
        .sort((a, b) => (a.year - b.year) || (a.month - b.month))
        .slice(-12) // either source alone is capped at 12; the union can exceed that — keep most recent 12
        .map((m) => ({
          label:               `${MONTH_NAMES[m.month - 1]} ${String(m.year).slice(2)}`,
          totalLabour:         m.totalLabour,
          totalHours:          m.totalHours,
          totalIncentives:     m.totalIncentives,
          totalEntries:        m.totalEntries,
          totalVehiclesLogged: m.totalVehiclesLogged,
        }));

      // ── Merge byBranch: union of branches in Entry OR SecurityLog ────────────
      // Same fix at the branch grain, plus: when no single branch is selected
      // (superadmin "All Branches"), every VALID_BRANCHES entry is guaranteed
      // to appear, even at zero — a branch never silently drops off the
      // comparison chart just because one data source has nothing for it.
      const branchMap = new Map();

      for (const b of byBranch) {
        branchMap.set(b._id, {
          _id: b._id,
          totalLabour: b.totalLabour, totalHours: b.totalHours,
          totalIncentives: b.totalIncentives, totalEntries: b.totalEntries,
          totalLeaveDays: b.totalLeaveDays,
          totalVehiclesLogged: 0,
        });
      }
      for (const v of vehiclesByBranch) {
        if (branchMap.has(v._id)) {
          branchMap.get(v._id).totalVehiclesLogged = v.totalVehiclesLogged;
        } else {
          branchMap.set(v._id, {
            _id: v._id,
            totalLabour: 0, totalHours: 0, totalIncentives: 0,
            totalEntries: 0, totalLeaveDays: 0,
            totalVehiclesLogged: v.totalVehiclesLogged,
          });
        }
      }

      const targetBranches = branch ? [branch] : VALID_BRANCHES;
      for (const b of targetBranches) {
        if (!branchMap.has(b)) {
          branchMap.set(b, {
            _id: b,
            totalLabour: 0, totalHours: 0, totalIncentives: 0,
            totalEntries: 0, totalLeaveDays: 0, totalVehiclesLogged: 0,
          });
        }
      }

      const mergedByBranch = [...branchMap.values()]
        .sort((a, b) => b.totalLabour - a.totalLabour);

      return {
        overview: {
          ...(overviewArr[0] || {
            totalLabour: 0, totalHours: 0, totalIncentives: 0,
            totalLeaveDays: 0, totalEntries: 0,
          }),
          totalVehiclesLogged: vehicleLogCount,
        },
        byBranch: mergedByBranch,
        byCategory,
        byMonth: mergedByMonth,
        topTechs,
        scopedBranch: isBranchAdmin(req) ? req.user.branch : null,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics fetch failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics/vehicle?range=today|week|month&branch=<BRANCH>
//
// Dedicated vehicle-ops analytics: assignment rate, response time, peak
// hours/days, branch comparison — derived using the SAME linking algorithm
// as getBoardLogs (securityController.js), adapted for a date RANGE instead
// of a single day.
//
// Correctness note — mirrors getBoardLogs's cross-date fix:
//   Because the whole range is fetched in one query, repeat visits WITHIN
//   the range are already in logGroups — no cross-lookup needed for those.
//   The only blind spot is the LAST log per vehicle in the range: if that
//   vehicle's next visit happens after the range ends, an entry filed for
//   that later visit could bleed into this window's stats. One bounded
//   aggregation (crossRangeNextMap) closes that gap, same technique
//   getBoardLogs uses across day boundaries.
//
// Performance: both queries hit existing compound indexes
// ({vehicleNoNorm,branch,loggedAt} / {vehicleNoNorm,branch,createdAt}).
// At month-range volume (~3,000 logs / ~2,500 entries) everything past the
// two DB reads is an in-memory partition — no per-document round trips.
// ─────────────────────────────────────────────────────────────────────────────
const getVehicleAnalytics = async (req, res) => {
  try {
    const range = ["today", "week", "month"].includes(req.query.range)
      ? req.query.range
      : "today";

    const isAdmin = req.user.role === "admin";
    let branch = null;
    if (isAdmin) {
      branch = req.user.branch;
    } else if (req.query.branch && req.query.branch !== "all") {
      if (!VALID_BRANCHES.includes(req.query.branch)) {
        return res.status(400).json({ message: "Invalid branch." });
      }
      branch = req.query.branch;
    }

    const today = utcMidnight();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    let startDate, endDate;
    if (range === "week") {
      startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      endDate = tomorrow;
    } else if (range === "month") {
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      endDate = tomorrow;
    } else {
      startDate = today;
      endDate = tomorrow;
    }

    const branchFilter = branch ? { branch } : {};
    const cacheKey = `vehicleAnalytics:${range}:${branch || "all"}`;
    const ttlSeconds = range === "today" ? 25 : range === "week" ? 60 : 120;

    const payload = await getOrSet(cacheKey, ttlSeconds, async () => {
      const logFilter = { date: { $gte: startDate, $lt: endDate }, ...branchFilter };
      const allLogs = await SecurityLog.find(logFilter)
        .sort({ vehicleNoNorm: 1, loggedAt: 1 })
        .lean();

      const dayMs = 24 * 60 * 60 * 1000;
      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / dayMs);
      const emptyTrend = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(startDate.getTime() + i * dayMs);
        return { date: d.toISOString().slice(0, 10), logged: 0, assigned: 0 };
      });
      const emptyPeakHours = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`,
        count: 0,
      }));
      const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const emptyPeakDays = DAY_NAMES.map((name, i) => ({ day: i, dayName: name, count: 0 }));

      if (allLogs.length === 0) {
        const targetBranches = branch ? [branch] : VALID_BRANCHES;
        return {
          range, branch: branch || "all",
          summary: {
            totalLogged: 0, assigned: 0, unassigned: 0, assignmentRate: 0,
            avgResponseMin: null, minResponseMin: null, maxResponseMin: null,
          },
          byBranch: targetBranches.map((b) => ({
            branch: b, logged: 0, assigned: 0, unassigned: 0,
            assignmentRate: 0, avgResponseMin: null,
          })),
          responseDist: { fast: 0, normal: 0, slow: 0 },
          trend: emptyTrend,
          peakHours: emptyPeakHours,
          peakDays: emptyPeakDays,
        };
      }

      // ── Build logGroups: vehicleNoNorm|branch → SecurityLog[] (asc loggedAt) ─
      const logGroups = new Map();
      let globalMinLoggedAt = Infinity;
      for (const log of allLogs) {
        const key = `${log.vehicleNoNorm}|${log.branch}`;
        if (!logGroups.has(key)) logGroups.set(key, []);
        logGroups.get(key).push(log);
        const t = new Date(log.loggedAt).getTime();
        if (t < globalMinLoggedAt) globalMinLoggedAt = t;
      }

      const vehicleNorms = [...new Set(allLogs.map((l) => l.vehicleNoNorm))];

      // ── Cross-range next-log lookup — same fix as getBoardLogs's cross-date ─
      const crossRangeNextLogDocs = await SecurityLog.aggregate([
        {
          $match: {
            vehicleNoNorm: { $in: vehicleNorms },
            ...branchFilter,
            loggedAt: { $gte: endDate },
          },
        },
        { $sort: { vehicleNoNorm: 1, branch: 1, loggedAt: 1 } },
        {
          $group: {
            _id: { vehicleNoNorm: "$vehicleNoNorm", branch: "$branch" },
            nextLoggedAt: { $first: "$loggedAt" },
          },
        },
      ]);
      const crossRangeNextMap = new Map();
      for (const doc of crossRangeNextLogDocs) {
        const key = `${doc._id.vehicleNoNorm}|${doc._id.branch}`;
        crossRangeNextMap.set(key, new Date(doc.nextLoggedAt).getTime());
      }

      // ── Batch fetch Entries — no upper bound, same rationale as getBoardLogs ─
      const entryFilter = {
        vehicleNoNorm: { $in: vehicleNorms },
        createdAt: { $gte: new Date(globalMinLoggedAt) },
        ...branchFilter,
      };
      const allEntries = await Entry.find(entryFilter).sort({ createdAt: 1 }).lean();

      // ── Partition — mirrors getBoardLogs's descending-scan algorithm ────────
      const entryMap = new Map();
      for (const entry of allEntries) {
        const key = `${entry.vehicleNoNorm}|${entry.branch}`;
        const logsForVehicle = logGroups.get(key);
        if (!logsForVehicle) continue;
        const entryTime = new Date(entry.createdAt).getTime();
        for (let i = logsForVehicle.length - 1; i >= 0; i--) {
          const logTime = new Date(logsForVehicle[i].loggedAt).getTime();
          if (entryTime >= logTime) {
            const intraRangeNextTime = i + 1 < logsForVehicle.length
              ? new Date(logsForVehicle[i + 1].loggedAt).getTime()
              : null;
            const crossRangeNextTime = i === logsForVehicle.length - 1
              ? (crossRangeNextMap.get(key) ?? null)
              : null;
            let nextLogTime;
            if (intraRangeNextTime !== null && crossRangeNextTime !== null) {
              nextLogTime = Math.min(intraRangeNextTime, crossRangeNextTime);
            } else {
              nextLogTime = intraRangeNextTime ?? crossRangeNextTime ?? Infinity;
            }
            if (entryTime < nextLogTime) {
              const lid = logsForVehicle[i]._id.toString();
              if (!entryMap.has(lid)) entryMap.set(lid, []);
              entryMap.get(lid).push(entry);
            }
            break;
          }
        }
      }

      // ── Compute stats ─────────────────────────────────────────────────────
      let assigned = 0, unassigned = 0;
      const responseMins = [];
      const branchStats = new Map();
      const trendMap = new Map();
      const hourMap = new Map();
      const dowMap = new Map();

      for (const log of allLogs) {
        const logEntries = entryMap.get(log._id.toString()) || [];
        const isAssigned = logEntries.length > 0;
        const dateStr = log.date.toISOString().slice(0, 10);

        if (!trendMap.has(dateStr)) trendMap.set(dateStr, { logged: 0, assigned: 0 });
        trendMap.get(dateStr).logged++;

        const hour = new Date(log.loggedAt).getUTCHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        const dow = new Date(log.date).getUTCDay();
        dowMap.set(dow, (dowMap.get(dow) || 0) + 1);

        if (!branchStats.has(log.branch)) {
          branchStats.set(log.branch, { logged: 0, assigned: 0, unassigned: 0, responseMins: [] });
        }
        const bs = branchStats.get(log.branch);
        bs.logged++;

        if (isAssigned) {
          assigned++;
          trendMap.get(dateStr).assigned++;
          bs.assigned++;
          const responseMin = Math.round(
            (new Date(logEntries[0].createdAt).getTime() - new Date(log.loggedAt).getTime()) / 60000
          );
          if (responseMin >= 0) {
            responseMins.push(responseMin);
            bs.responseMins.push(responseMin);
          }
        } else {
          unassigned++;
          bs.unassigned++;
        }
      }

      const totalLogged = allLogs.length;
      const assignmentRate = totalLogged > 0 ? Math.round((assigned / totalLogged) * 1000) / 10 : 0;
      const avgResponseMin = responseMins.length > 0
        ? Math.round(responseMins.reduce((a, b) => a + b, 0) / responseMins.length) : null;
      const minResponseMin = responseMins.length > 0 ? Math.min(...responseMins) : null;
      const maxResponseMin = responseMins.length > 0 ? Math.max(...responseMins) : null;

      const responseDist = {
        fast:   responseMins.filter((m) => m < 30).length,
        normal: responseMins.filter((m) => m >= 30 && m <= 60).length,
        slow:   responseMins.filter((m) => m > 60).length,
      };

      const targetBranches = branch ? [branch] : VALID_BRANCHES;
      const byBranch = targetBranches.map((b) => {
        const bs = branchStats.get(b) || { logged: 0, assigned: 0, unassigned: 0, responseMins: [] };
        const bRate = bs.logged > 0 ? Math.round((bs.assigned / bs.logged) * 1000) / 10 : 0;
        const bAvg = bs.responseMins.length > 0
          ? Math.round(bs.responseMins.reduce((a, c) => a + c, 0) / bs.responseMins.length) : null;
        return {
          branch: b, logged: bs.logged, assigned: bs.assigned, unassigned: bs.unassigned,
          assignmentRate: bRate, avgResponseMin: bAvg,
        };
      });

      const trend = emptyTrend.map((t) => {
        const found = trendMap.get(t.date);
        return found ? { date: t.date, logged: found.logged, assigned: found.assigned } : t;
      });
      const peakHours = emptyPeakHours.map((h) => ({ ...h, count: hourMap.get(h.hour) || 0 }));
      const peakDays  = emptyPeakDays.map((d) => ({ ...d, count: dowMap.get(d.day) || 0 }));

      return {
        range, branch: branch || "all",
        summary: { totalLogged, assigned, unassigned, assignmentRate, avgResponseMin, minResponseMin, maxResponseMin },
        byBranch, responseDist, trend, peakHours, peakDays,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error("[getVehicleAnalytics]", err);
    res.status(500).json({ message: "Vehicle analytics fetch failed" });
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

    const updatedUser = await User
      .findByIdAndUpdate(userId, updates, { new: true })
      .select("-password");

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
  getVehicleAnalytics,
  editUser,
  deleteUser,
};