const SecurityLog            = require("../models/SecurityLog");
const Entry                  = require("../models/Entry");
const { normalizeVehicleNo } = require("../utils/vehicleUtils");

// ─── Helper: UTC midnight ─────────────────────────────────────────────────────
function utcMidnight(input) {
  const d = input ? new Date(input) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── POST /api/security/log ───────────────────────────────────────────────────
const createLog = async (req, res) => {
  try {
    const { vehicleNo } = req.body;

    if (!vehicleNo || vehicleNo.trim().length < 2) {
      return res.status(400).json({
        message: "Vehicle number must be at least 2 characters",
      });
    }

    const branch = req.user.branch;
    if (!branch || branch.trim() === "") {
      return res.status(400).json({
        message: "Security user has no branch configured. Contact your developer.",
      });
    }

    const trimmed       = vehicleNo.trim();
    const vehicleNoNorm = normalizeVehicleNo(trimmed);

    const log = await SecurityLog.create({
      vehicleNo:    trimmed,
      vehicleNoNorm,
      branch,
      loggedBy:     req.user.userId,
      date:         utcMidnight(),
      loggedAt:     new Date(),
    });

    res.status(201).json(log);
  } catch (err) {
    console.error("[createLog]", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/security/today ──────────────────────────────────────────────────
const getTodayLogs = async (req, res) => {
  try {
    const logs = await SecurityLog.find({
      loggedBy: req.user.userId,
      date:     utcMidnight(),
    })
      .sort({ loggedAt: -1 })
      .lean();

    res.json(logs);
  } catch (err) {
    console.error("[getTodayLogs]", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/security/log/:id ────────────────────────────────────────────────
const editLog = async (req, res) => {
  try {
    const { vehicleNo } = req.body;

    if (!vehicleNo || vehicleNo.trim().length < 2) {
      return res.status(400).json({
        message: "Vehicle number must be at least 2 characters",
      });
    }

    const log = await SecurityLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: "Log not found" });

    if (log.loggedBy.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Cannot edit another user's log" });
    }

    const trimmed     = vehicleNo.trim();
    log.vehicleNo     = trimmed;
    log.vehicleNoNorm = normalizeVehicleNo(trimmed);

    await log.save();
    res.json(log);
  } catch (err) {
    console.error("[editLog]", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/security/board ──────────────────────────────────────────────────
const getBoardLogs = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const branch = isAdmin
      ? req.user.branch
      : (req.query.branch || null);

    const targetDate = utcMidnight(
      req.query.date ? new Date(req.query.date) : null
    );

    const q = (req.query.q || "").trim();

    const LIMIT    = 10;
    const safePage = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const filter = { date: targetDate };
    if (branch) filter.branch = branch;
    if (q.length >= 3) {
      const normQ = normalizeVehicleNo(q);
      filter.vehicleNoNorm = { $regex: normQ, $options: "i" };
    }

    const allLogs = await SecurityLog.find(filter)
      .populate("loggedBy", "name")
      .sort({ vehicleNoNorm: 1, loggedAt: 1 })
      .lean();

    const total      = allLogs.length;
    const totalPages = Math.ceil(total / LIMIT);

    const pageLogs = allLogs.slice((safePage - 1) * LIMIT, safePage * LIMIT);

    // ── Page entries (for display) ────────────────────────────────────────────
    const withEntries = await Promise.all(
      pageLogs.map(async (log) => {
        const nextLog = allLogs.find(
          (l) =>
            l.vehicleNoNorm === log.vehicleNoNorm &&
            l.branch        === log.branch        &&
            l.loggedAt      >  log.loggedAt
        );

        const entryFilter = {
          vehicleNoNorm: log.vehicleNoNorm,
          branch:        log.branch,
          createdAt:     { $gte: log.loggedAt },
        };
        if (nextLog) entryFilter.createdAt.$lt = nextLog.loggedAt;

        const entries = await Entry.find(entryFilter)
          .populate("userId", "name technicianId technicianType")
          .sort({ createdAt: 1 })
          .lean();

        return {
          ...log,
          entries,
          status: entries.length > 0 ? "assigned" : "unassigned",
        };
      })
    );

    // ── Total assigned/unassigned across ALL matching logs (not page-limited) ─
    // Single bulk Entry query — avoids N+1 across all logs.
    const nextDay            = new Date(targetDate.getTime() + 86400000);
    const uniqueVehicleNorms = [...new Set(allLogs.map((l) => l.vehicleNoNorm))];

    let totalAssigned   = 0;
    let totalUnassigned = 0;

    if (uniqueVehicleNorms.length > 0) {
      const bulkEntryQuery = {
        vehicleNoNorm: { $in: uniqueVehicleNorms },
        createdAt:     { $gte: targetDate, $lt: nextDay },
      };
      if (branch) bulkEntryQuery.branch = branch;

      const bulkEntries = await Entry.find(bulkEntryQuery)
        .select("vehicleNoNorm branch createdAt")
        .lean();

      for (const log of allLogs) {
        const nextLog = allLogs.find(
          (l) =>
            l.vehicleNoNorm === log.vehicleNoNorm &&
            l.branch        === log.branch        &&
            l.loggedAt      >  log.loggedAt
        );

        const hasEntry = bulkEntries.some(
          (e) =>
            e.vehicleNoNorm === log.vehicleNoNorm &&
            e.branch        === log.branch        &&
            new Date(e.createdAt) >= new Date(log.loggedAt) &&
            (!nextLog || new Date(e.createdAt) < new Date(nextLog.loggedAt))
        );

        if (hasEntry) totalAssigned++;
        else          totalUnassigned++;
      }
    }

    res.json({
      logs:           withEntries,
      total,
      page:           safePage,
      totalPages,
      date:           targetDate,
      totalAssigned,
      totalUnassigned,
    });
  } catch (err) {
    console.error("[getBoardLogs]", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createLog, getTodayLogs, editLog, getBoardLogs };