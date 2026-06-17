const SecurityLog            = require("../models/SecurityLog");
const Entry                  = require("../models/Entry");
const { normalizeVehicleNo } = require("../utils/vehicleUtils");
const { getOrSet }           = require("../utils/cache");

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
//
// Pipeline overview (5 steps + 1 fix step):
//
//   1. Fetch all SecurityLogs for the board date/branch/search filter.
//   2. Build logGroups: Map of "vehicleNoNorm|branch" → sorted SecurityLog[].
//  2.5 FIX — Cross-date next-log lookup:
//      Find the earliest SecurityLog for each vehicle on any date AFTER the
//      board date. This gives the true upper bound for entry attribution when
//      a vehicle makes multiple visits across different calendar dates.
//      Without this, entries from a later visit bleed into an earlier board
//      date because the partition algorithm's fallback was Infinity.
//   3. ONE batched Entry.find() for all vehicles (no N+1).
//   4. Partition each Entry into the correct SecurityLog window using:
//        a. intraDayNextTime  — next log for the same vehicle on the same day
//        b. crossDateNextTime — earliest log for the same vehicle on a future day
//      The effective upper bound is Math.min(a, b), or whichever is available,
//      or Infinity if neither exists (vehicle has not revisited).
//   5. Assemble paginated response (shape unchanged — no frontend changes needed).
//
// CACHED (new): this whole pipeline — including the cross-date aggregation
// and the batched Entry lookup — is wrapped in a 25s cache, keyed on every
// input that changes the result (date, branch, search query, page). The
// frontend polls this endpoint every 30s; a 25s TTL means the cache is
// always allowed to refresh before the next poll for the same exact view,
// while still collapsing duplicate concurrent loads — e.g. a branch admin
// and a superadmin both viewing the same branch+date within a few seconds
// of each other, or React re-renders firing a near-simultaneous duplicate
// request. If the board ever feels stale, lower the TTL below 25 first
// before touching anything else here.
// ─────────────────────────────────────────────────────────────────────────────
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

    const cacheKey = `board:${targetDate.toISOString()}:${branch || "all"}:${q}:${safePage}`;

    const responsePayload = await getOrSet(cacheKey, 25, async () => {
      // ── 1. Fetch all matching logs for the board date ──────────────────────
      // Same query as before — date-scoped, branch-scoped when applicable,
      // sorted for the linking algorithm.
      const allLogs = await SecurityLog.find(filter)
        .populate("loggedBy", "name")
        .sort({ vehicleNoNorm: 1, loggedAt: 1 })
        .lean();

      const total      = allLogs.length;
      const totalPages = Math.ceil(total / LIMIT);

      // Short-circuit: no logs → skip everything
      if (total === 0) {
        return {
          logs:            [],
          total:           0,
          page:            safePage,
          totalPages:      0,
          date:            targetDate,
          totalAssigned:   0,
          totalUnassigned: 0,
        };
      }

      // ── 2. Build logGroups ─────────────────────────────────────────────────
      // allLogs is already sorted { vehicleNoNorm: 1, loggedAt: 1 } from the
      // DB — each group's array is naturally in ascending loggedAt order.
      const logGroups       = new Map(); // "vehicleNoNorm|branch" → SecurityLog[]
      let   globalMinLoggedAt = Infinity;

      for (const log of allLogs) {
        const key = `${log.vehicleNoNorm}|${log.branch}`;
        if (!logGroups.has(key)) logGroups.set(key, []);
        logGroups.get(key).push(log);

        const t = new Date(log.loggedAt).getTime();
        if (t < globalMinLoggedAt) globalMinLoggedAt = t;
      }

      // ── 2.5. Cross-date next-log lookup ───────────────────────────────────
      //
      // WHY THIS EXISTS:
      //   The original partition algorithm used nextLogTime = Infinity for the
      //   last log of each vehicle on the board date (no subsequent log existed
      //   within the same date's logGroups). This caused entries from a later
      //   visit (e.g. June 19 job card) to be incorrectly attributed to an
      //   earlier board date's log (e.g. June 14 visit) because:
      //     entryTime (June 19) >= logTime (June 14) → true
      //     entryTime (June 19) < Infinity            → true  ← wrong
      //
      // THE FIX:
      //   Run one aggregation to find, per vehicle+branch, the earliest
      //   SecurityLog that exists on any date strictly after the board date.
      //   Use its loggedAt as the cross-date upper bound in step 4.
      //
      // BOUNDARY — nextMidnight vs globalMaxLoggedAt:
      //   We use targetDate + 24h (next UTC midnight) as the $gte cutoff, NOT
      //   the highest loggedAt in allLogs. Reason: same-day logs all share
      //   date === targetDate and their loggedAt is somewhere within that day.
      //   nextMidnight cleanly separates "today's logs" (already in logGroups)
      //   from "future logs" (what we're looking for), with no overlap.
      //
      // EXISTING DATA SAFETY:
      //   - Vehicles without future visits → crossDateNextMap has no entry →
      //     nextLogTime falls back to Infinity → identical to original behavior.
      //   - Vehicles with a same-day return → intraDayNextTime handles it
      //     (already worked correctly before this change).
      //   - Vehicles with a future-date return → now correctly bounded.
      //
      // INDEX USED: { vehicleNoNorm: 1, branch: 1, loggedAt: 1 }
      //   The $match on vehicleNoNorm ($in) and loggedAt ($gte) lets MongoDB use
      //   this compound index efficiently. At 36k logs/year this aggregation
      //   runs in single-digit ms.

      const vehicleNorms = [...new Set(allLogs.map((l) => l.vehicleNoNorm))];
      const nextMidnight = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      const crossDateNextLogDocs = await SecurityLog.aggregate([
        {
          $match: {
            vehicleNoNorm: { $in: vehicleNorms },
            ...(branch ? { branch } : {}),
            loggedAt: { $gte: nextMidnight }, // strictly future dates only
          },
        },
        // Sort first so $first inside $group picks the earliest (soonest) log.
        { $sort: { vehicleNoNorm: 1, branch: 1, loggedAt: 1 } },
        {
          $group: {
            _id:         { vehicleNoNorm: "$vehicleNoNorm", branch: "$branch" },
            nextLoggedAt: { $first: "$loggedAt" },
          },
        },
      ]);

      // "KA14MP1212|BALLARI" → nextLoggedAt (ms timestamp)
      // Empty map when no vehicle has returned on a future date — safe default.
      const crossDateNextMap = new Map();
      for (const doc of crossDateNextLogDocs) {
        const key = `${doc._id.vehicleNoNorm}|${doc._id.branch}`;
        crossDateNextMap.set(key, new Date(doc.nextLoggedAt).getTime());
      }

      // ── 3. ONE batched Entry query for all vehicles ────────────────────────
      // Fetches all entries since the earliest log time on this board date.
      // No upper bound on createdAt intentionally: an entry on D+1 legitimately
      // belongs to a log on D when no re-entry exists yet (the crossDateNextMap
      // step handles narrowing in the partition, not here). Adding a global
      // $lte here would incorrectly drop valid entries for vehicles that haven't
      // returned yet but whose job card was filed the next day.
      const entryFilter = {
        vehicleNoNorm: { $in: vehicleNorms },
        createdAt:     { $gte: new Date(globalMinLoggedAt) },
      };
      if (branch) entryFilter.branch = branch;

      const allEntries = await Entry.find(entryFilter)
        .populate("userId", "name technicianId technicianType")
        .sort({ createdAt: 1 }) // ascending — same as original
        .lean();

      // ── 4. Partition entries into their correct SecurityLog window ─────────
      //
      // For each entry, find the owning log by descending scan within the
      // sorted log group for that vehicle+branch. Stops at the last log whose
      // loggedAt ≤ entry.createdAt, then verifies entry.createdAt < nextLogTime.
      //
      // nextLogTime resolution (tighter of whatever is available):
      //   a) intraDayNextTime  — next log for this vehicle on the same board date
      //                          (same as original algorithm — unchanged)
      //   b) crossDateNextTime — earliest log for this vehicle on a future date
      //                          (NEW — the fix for cross-date bleeding)
      //   Effective bound = Math.min(a, b) if both exist, else whichever exists,
      //   else Infinity (vehicle hasn't returned at all — open window, correct).
      const entryMap = new Map(); // log._id.toString() → Entry[]

      for (const entry of allEntries) {
        const key            = `${entry.vehicleNoNorm}|${entry.branch}`;
        const logsForVehicle = logGroups.get(key);

        // Entry's vehicle wasn't in today's logs for this branch — skip
        if (!logsForVehicle) continue;

        const entryTime = new Date(entry.createdAt).getTime();

        // Descending scan: find the last log whose loggedAt ≤ entry.createdAt
        for (let i = logsForVehicle.length - 1; i >= 0; i--) {
          const logTime = new Date(logsForVehicle[i].loggedAt).getTime();

          if (entryTime >= logTime) {

            // a) Intra-day upper bound (original behavior, unchanged)
            const intraDayNextTime =
              i + 1 < logsForVehicle.length
                ? new Date(logsForVehicle[i + 1].loggedAt).getTime()
                : null;

            // b) Cross-date upper bound (new — null when vehicle hasn't returned)
            const crossDateNextTime = crossDateNextMap.get(key) ?? null;

            // Effective upper bound: tightest bound wins.
            // If neither exists → Infinity (open window for vehicles with no return).
            let nextLogTime;
            if (intraDayNextTime !== null && crossDateNextTime !== null) {
              nextLogTime = Math.min(intraDayNextTime, crossDateNextTime);
            } else {
              nextLogTime = intraDayNextTime ?? crossDateNextTime ?? Infinity;
            }

            if (entryTime < nextLogTime) {
              const lid = logsForVehicle[i]._id.toString();
              if (!entryMap.has(lid)) entryMap.set(lid, []);
              entryMap.get(lid).push(entry);
            }
            break; // found the window — stop scanning
          }
          // If entryTime < logTime[0], loop exits with no assignment → correct
        }
      }

      // ── 5. Assemble full result (response shape identical to original) ──────
      const allWithEntries = allLogs.map((log) => {
        const entries = entryMap.get(log._id.toString()) || [];
        return {
          ...log,
          entries,
          status: entries.length > 0 ? "assigned" : "unassigned",
        };
      });

      // Current-page slice (display only — totals always cover all logs)
      const withEntries = allWithEntries.slice(
        (safePage - 1) * LIMIT,
        safePage * LIMIT
      );

      // Totals from the full result — no drift between displayed and total counts
      let totalAssigned   = 0;
      let totalUnassigned = 0;
      for (const log of allWithEntries) {
        if (log.status === "assigned") totalAssigned++;
        else                            totalUnassigned++;
      }

      return {
        logs:            withEntries,
        total,
        page:            safePage,
        totalPages,
        date:            targetDate,
        totalAssigned,
        totalUnassigned,
      };
    });

    res.json(responsePayload);
  } catch (err) {
    console.error("[getBoardLogs]", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createLog, getTodayLogs, editLog, getBoardLogs };