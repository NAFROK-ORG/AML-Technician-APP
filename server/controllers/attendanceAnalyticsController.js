/**
 * server/controllers/attendanceAnalyticsController.js
 *
 * GET /api/admin/analytics/attendance
 * GET /api/admin/analytics/attendance/export
 *
 * ── Working-day model ──────────────────────────────────────────────────
 * Mon–Sat only for rate / trend / dip-detection denominator.
 * Sunday shifts are fetched, ghost-checked, and surfaced separately —
 * never blended into the rate so no technician can exceed 100%.
 *
 * ── Query strategy ─────────────────────────────────────────────────────
 * Always hits {branch,date} indexes. Superadmin "all" view loops the 5
 * known branches concurrently (Promise.allSettled) — avoids a global
 * date-range scan that would bypass those indexes as Entry grows.
 * Promise.allSettled means one failing branch never kills the whole view.
 *
 * ── CHANGES IN THIS VERSION ────────────────────────────────────────────
 * [FIX-STATUS]  statusFor() now receives consistencyScore, not rate.
 *               A technician with 85% attendance but 100% ghost days now
 *               shows Critical, not Good. Rate alone was misleading.
 *
 * [FIX-SORT]    technicianRows sorted by consistencyScore, not rate.
 *               Table order now reflects actual productive contribution.
 *
 * [NEW-BUCKETS] markBuckets added to each technicianRow — per-technician
 *               count of how many marks fell before 8AM, 8–9AM, 9–10AM,
 *               and after 10AM. Used by the CSV export and frontend table.
 *
 * [NEW-EXPORT]  getAttendanceExport — dedicated branch-scoped export
 *               endpoint. Always bypasses cache (export = fresh data).
 *               Requires a specific branch; "all" is rejected.
 */

const User       = require("../models/User");
const Attendance = require("../models/Attendance");
const Entry      = require("../models/Entry");
const { getOrSet }       = require("../utils/cache");
const { VALID_BRANCHES } = require("../utils/constants");
const {
  utcMidnight,
  toISTHour:                 istHour,
  toISTMinutesSinceMidnight: istMinutesSinceMidnight,
} = require("../utils/timeUtils");

// ── Constants ─────────────────────────────────────────────────────────
const DAY_MS               = 24 * 60 * 60 * 1000;
const DAY_NAMES            = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WORKING_DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6]; // Mon–Sat; 0=Sun
const CACHE_TTL_SECONDS    = 60;
// Minimum number of after-10AM-IST mark days before a technician is flagged
const LATE_FLAG_THRESHOLD  = 3;
const DIP_THRESHOLD_POINTS = 15; // % below a branch's MTD avg to count as a dip
const DOW_FLAG_GAP         = 12; // % gap between weakest and other days to emit a flag

// ── In-flight request de-duplication ──────────────────────────────────
const inFlight = new Map();

async function getOrSetDeduped(key, ttlSeconds, fetchFn) {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = getOrSet(key, ttlSeconds, fetchFn).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

function isoDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function currentMonthRange() {
  const now  = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const today = utcMidnight();
  const elapsedTo = today.getTime() + DAY_MS < to.getTime()
    ? new Date(today.getTime() + DAY_MS)
    : to;
  return { from, to, elapsedTo, today };
}

function allDaysSoFar(from, elapsedTo) {
  const days = [];
  let d = new Date(from);
  while (d.getTime() < elapsedTo.getTime()) {
    days.push(new Date(d));
    d = new Date(d.getTime() + DAY_MS);
  }
  return days;
}

function isWorkingDay(date) {
  return WORKING_DAYS_OF_WEEK.includes(date.getUTCDay());
}

function fmtISTFromMinutes(mins) {
  if (mins === null || mins === undefined) return null;
  let h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function markTimeBucket(hour) {
  if (hour < 8)  return "Before 8AM";
  if (hour < 9)  return "8–9 AM";
  if (hour < 10) return "9–10 AM";
  return "After 10AM";
}

// [FIX-STATUS] Receives consistencyScore now — not raw rate.
// consistencyScore = rate × nonGhostRatio, so ghost attendance is penalised.
// Thresholds unchanged — they self-correct with the new input.
function statusFor(score) {
  if (score >= 95) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 65) return "At Risk";
  return "Critical";
}

// ── Data fetch: one branch, always hits {branch,date} index ───────────
async function fetchBranchSlice(branch, from, elapsedTo) {
  const technicians = await User.find({ role: "technician", profileComplete: true, branch })
    .select("_id name technicianId branch technicianType")
    .lean();

  if (technicians.length === 0) {
    return { technicians: [], attendance: [], entries: [] };
  }

  const [attendance, entries] = await Promise.all([
    Attendance.find({ branch, date: { $gte: from, $lt: elapsedTo } })
      .select("userId branch date markedAt")
      .lean(),
    Entry.find({ branch, date: { $gte: from, $lt: elapsedTo } })
      .select("userId date")
      .lean(),
  ]);

  return { technicians, attendance, entries };
}

// ── Entry day-key set for ghost detection ──────────────────────────────
function buildEntryDayKeys(entries) {
  const keys = new Set();
  for (const e of entries) {
    const dayTs = utcMidnight(e.date).getTime();
    keys.add(`${e.userId}|${dayTs}`);
  }
  return keys;
}

// ── Per-technician stats ───────────────────────────────────────────────
function computeTechnicianStats(technicians, attendance, entries, workingDaysSoFarCount) {
  const entryDayKeys = buildEntryDayKeys(entries);

  const perTech = new Map();
  for (const t of technicians) {
    perTech.set(String(t._id), {
      tech:             t,
      daysPresent:      0,
      ghostDays:        0,
      totalPresentDays: 0,
      markMinutes:      [],
      sundayDates:      [],
    });
  }

  for (const a of attendance) {
    const uid    = String(a.userId);
    const rec    = perTech.get(uid);
    if (!rec) continue;

    const date   = new Date(a.date);
    const dayKey = `${uid}|${date.getTime()}`;
    const isGhost = !entryDayKeys.has(dayKey);
    const working = isWorkingDay(date);

    rec.totalPresentDays += 1;
    if (isGhost) rec.ghostDays += 1;
    rec.markMinutes.push(istMinutesSinceMidnight(new Date(a.markedAt)));

    if (working) {
      rec.daysPresent += 1;
    } else {
      rec.sundayDates.push(isoDateStr(date));
    }
  }

  const technicianRows = [];

  for (const { tech, daysPresent, ghostDays, totalPresentDays, markMinutes, sundayDates } of perTech.values()) {
    const rate = workingDaysSoFarCount > 0
      ? Math.round((daysPresent / workingDaysSoFarCount) * 100)
      : 0;
    const nonGhostRatio = totalPresentDays > 0
      ? (totalPresentDays - ghostDays) / totalPresentDays
      : 0;
    const consistencyScore = Math.round((rate / 100) * nonGhostRatio * 100);
    const avgMarkMinutes   = markMinutes.length
      ? markMinutes.reduce((s, m) => s + m, 0) / markMinutes.length
      : null;

    // [NEW-BUCKETS] Per-technician mark-time bucket counts.
    // Mirrors the branch-level buckets in computeMarkTimeDistribution
    // but stored per-row so the CSV export has per-person granularity.
    const markBuckets = { before8: 0, am8to9: 0, am9to10: 0, after10: 0 };
    for (const m of markMinutes) {
      const h = Math.floor(m / 60);
      if      (h < 8)  markBuckets.before8++;
      else if (h < 9)  markBuckets.am8to9++;
      else if (h < 10) markBuckets.am9to10++;
      else             markBuckets.after10++;
    }

    technicianRows.push({
      id:             tech._id,
      name:           tech.name,
      technicianId:   tech.technicianId,
      technicianType: tech.technicianType,
      daysPresent,
      workingDays:    workingDaysSoFarCount,
      rate,
      ghostDays,
      consistencyScore,
      markBuckets,                          // [NEW-BUCKETS]
      avgMarkTime:  fmtISTFromMinutes(avgMarkMinutes),
      status:       statusFor(consistencyScore), // [FIX-STATUS] was statusFor(rate)
      sundayShifts: { count: sundayDates.length, dates: sundayDates.sort() },
    });
  }

  // [FIX-SORT] Sort by consistencyScore — not raw rate.
  // Raw rate alone let high-attendance ghost-heavy technicians rank first.
  technicianRows.sort((a, b) => b.consistencyScore - a.consistencyScore);
  return technicianRows;
}

// ── Daily trend + day-of-week pattern (Mon–Sat only) ──────────────────
function computeDailyTrendAndDow(attendance, technicianCount, workingDays) {
  const countByDayTs = new Map();
  for (const a of attendance) {
    if (!isWorkingDay(new Date(a.date))) continue;
    const ts = new Date(a.date).getTime();
    countByDayTs.set(ts, (countByDayTs.get(ts) || 0) + 1);
  }

  const dailyTrend = workingDays.map((day) => {
    const present = countByDayTs.get(day.getTime()) || 0;
    const rate    = technicianCount ? Math.round((present / technicianCount) * 100) : 0;
    return { date: isoDateStr(day), present, total: technicianCount, rate, dow: DAY_NAMES[day.getUTCDay()] };
  });

  const dowBuckets = new Map();
  for (const row of dailyTrend) {
    if (!dowBuckets.has(row.dow)) dowBuckets.set(row.dow, []);
    dowBuckets.get(row.dow).push(row.rate);
  }
  const pattern = WORKING_DAYS_OF_WEEK.map((dowNum) => {
    const name  = DAY_NAMES[dowNum];
    const rates = dowBuckets.get(name) || [];
    const avgRate = rates.length
      ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
      : 0;
    return { day: name, avgRate };
  });

  let flag = null;
  if (pattern.length >= 2) {
    const weakest   = pattern.reduce((min, p) => p.avgRate < min.avgRate ? p : min);
    const othersAvg = Math.round(
      pattern
        .filter((p) => p.day !== weakest.day)
        .reduce((s, p) => s + p.avgRate, 0) /
      (pattern.length - 1)
    );
    if (othersAvg - weakest.avgRate >= DOW_FLAG_GAP) {
      flag = `${weakest.day} averages ${weakest.avgRate}% vs ${othersAvg}% on other days`;
    }
  }

  return { dailyTrend, dayOfWeekPattern: { pattern, flag } };
}

// ── Mark-time distribution ─────────────────────────────────────────────
function computeMarkTimeDistribution(attendance, technicians) {
  const buckets = { "Before 8AM": 0, "8–9 AM": 0, "9–10 AM": 0, "After 10AM": 0 };
  const lateCountByUser = new Map();

  for (const a of attendance) {
    const hour   = istHour(new Date(a.markedAt));
    const bucket = markTimeBucket(hour);
    buckets[bucket] += 1;
    if (bucket === "After 10AM") {
      const uid = String(a.userId);
      lateCountByUser.set(uid, (lateCountByUser.get(uid) || 0) + 1);
    }
  }

  const techMap = new Map(technicians.map((t) => [String(t._id), t]));
  const lateFlags = [];
  for (const [uid, count] of lateCountByUser.entries()) {
    if (count >= LATE_FLAG_THRESHOLD) {
      const tech = techMap.get(uid);
      if (tech) lateFlags.push({ name: tech.name, lateDays: count });
    }
  }
  lateFlags.sort((a, b) => b.lateDays - a.lateDays);

  const distribution = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  return { distribution, lateFlags };
}

// ── Ghost-attendance roster ────────────────────────────────────────────
function computeGhostList(technicianRows, attendance, entries) {
  const entryDayKeys = buildEntryDayKeys(entries);
  const byTech = new Map();

  for (const a of attendance) {
    const uid    = String(a.userId);
    const date   = new Date(a.date);
    const dayKey = `${uid}|${date.getTime()}`;
    if (entryDayKeys.has(dayKey)) continue;
    if (!byTech.has(uid)) byTech.set(uid, []);
    byTech.get(uid).push(isoDateStr(date));
  }

  const ghostList = [];
  for (const row of technicianRows) {
    const dates = byTech.get(String(row.id));
    if (dates && dates.length) {
      ghostList.push({
        technicianId: row.technicianId,
        name:         row.name,
        dates:        dates.sort(),
        ghostDays:    dates.length,
      });
    }
  }
  return ghostList;
}

// ── Branch summary ─────────────────────────────────────────────────────
function computeBranchSummary(branch, technicianRows, sundayShiftsTotal) {
  const totalTechs      = technicianRows.length;
  const totalRate       = totalTechs
    ? Math.round(technicianRows.reduce((s, r) => s + r.rate, 0) / totalTechs)
    : 0;
  const totalGhostDays   = technicianRows.reduce((s, r) => s + r.ghostDays, 0);
  const totalPresentDays = technicianRows.reduce((s, r) => s + r.daysPresent, 0);
  const ghostRate        = totalPresentDays > 0 ? totalGhostDays / totalPresentDays : 0;
  const productiveScore  = Math.round(totalRate * (1 - ghostRate));

  return {
    branch,
    totalTechnicians:     totalTechs,
    attendanceRate:       totalRate,
    ghostAttendanceCount: totalGhostDays,
    ghostRate:            Math.round(ghostRate * 100),
    productiveScore,
    sundayShiftsTotal,
  };
}

// ── Synchronous dip detection (Mon–Sat only) ───────────────────────────
function computeSynchronousDips(branchTrends) {
  const branchNames = Object.keys(branchTrends);
  if (branchNames.length < 2) return [];

  const mtdAvg = {};
  for (const b of branchNames) {
    const rates = branchTrends[b].map((r) => r.rate);
    mtdAvg[b] = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
  }

  const dayCount = branchTrends[branchNames[0]].length;
  const dips = [];

  for (let i = 0; i < dayCount; i++) {
    const dipped = [];
    let date = null;
    for (const b of branchNames) {
      const row = branchTrends[b][i];
      date = row.date;
      if (row.rate <= mtdAvg[b] - DIP_THRESHOLD_POINTS) {
        dipped.push(b);
      }
    }
    if (dipped.length >= 2) {
      dips.push({
        date,
        branches:       dipped,
        classification: dipped.length >= 3 ? "systemic" : "isolated",
      });
    }
  }
  return dips;
}

// ── Heatmap color band ─────────────────────────────────────────────────
function heatBand(rate) {
  if (rate >= 90) return "green";
  if (rate >= 75) return "blue";
  if (rate >= 60) return "amber";
  return "red";
}

// ── Single-branch view ─────────────────────────────────────────────────
async function buildBranchView(branch, from, elapsedTo, workingDays) {
  const { technicians, attendance, entries } = await fetchBranchSlice(branch, from, elapsedTo);

  const technicianRows       = computeTechnicianStats(technicians, attendance, entries, workingDays.length);
  const { dailyTrend, dayOfWeekPattern } = computeDailyTrendAndDow(attendance, technicians.length, workingDays);
  const markTimeDistribution = computeMarkTimeDistribution(attendance, technicians);
  const ghostAttendance      = computeGhostList(technicianRows, attendance, entries);

  const sundayShiftsTotal = technicianRows.reduce((s, r) => s + r.sundayShifts.count, 0);
  const summary           = computeBranchSummary(branch, technicianRows, sundayShiftsTotal);
  const consistentCount   = technicianRows.filter((r) => r.rate >= 90).length;

  const today             = utcMidnight();
  const presentTodayCount = attendance.filter(
    (a) => new Date(a.date).getTime() === today.getTime()
  ).length;

  return {
    scope:   "branch",
    branch,
    month:            isoDateStr(from).slice(0, 7),
    workingDaysSoFar: workingDays.length,
    totalTechnicians: technicians.length,
    message: technicians.length === 0 ? "No technicians found for this branch." : undefined,
    kpis: {
      presentToday:         { present: presentTodayCount, total: technicians.length },
      monthRate:            summary.attendanceRate,
      ghostAttendanceCount: summary.ghostAttendanceCount,
      consistentCount,
      sundayShiftsTotal,
    },
    dailyTrend,
    dayOfWeekPattern,
    markTimeDistribution,
    technicians: technicianRows,
    ghostAttendance,
    _summary:    summary,
    _dailyTrend: dailyTrend,
  };
}

// ── Superadmin cross-branch view ───────────────────────────────────────
async function buildSuperadminView(from, elapsedTo, workingDays) {
  const settled = await Promise.allSettled(
    VALID_BRANCHES.map((branch) => buildBranchView(branch, from, elapsedTo, workingDays))
  );

  const branchViewsArray = [];
  const failedBranches   = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      branchViewsArray.push(result.value);
    } else {
      console.error(`[AttendanceAnalytics] ${VALID_BRANCHES[i]} build failed:`, result.reason);
      failedBranches.push(VALID_BRANCHES[i]);
      branchViewsArray.push(null);
    }
  });

  const validViews = branchViewsArray.filter(Boolean);

  const branchViews = {};
  VALID_BRANCHES.forEach((b, i) => {
    if (branchViewsArray[i]) branchViews[b] = branchViewsArray[i];
  });

  const branches = validViews.map((v) => ({ ...v._summary }));
  branches.sort((a, b) => b.productiveScore - a.productiveScore);
  branches.forEach((b, i) => { b.rank = i + 1; });

  const heatmap = validViews.map((v) => ({
    branch: v.branch,
    days:   v.dailyTrend.map((d) => ({ date: d.date, rate: d.rate, band: heatBand(d.rate) })),
  }));

  const branchTrendsForDips = {};
  for (const b of Object.keys(branchViews)) branchTrendsForDips[b] = branchViews[b].dailyTrend;

  const synchronousDips = Object.keys(branchViews).length >= 2
    ? computeSynchronousDips(branchTrendsForDips)
    : [];

  return {
    scope:            "all",
    month:            isoDateStr(from).slice(0, 7),
    workingDaysSoFar: workingDays.length,
    branches,
    heatmap,
    synchronousDips,
    ...(failedBranches.length > 0 && {
      partialDataWarning: `Data temporarily unavailable for: ${failedBranches.join(", ")}`,
    }),
  };
}

// ── Controller: analytics ──────────────────────────────────────────────
const getAttendanceAnalytics = async (req, res) => {
  try {
    const isSuperAdmin    = req.user.role === "superadmin";
    const requestedBranch = req.query.branch && req.query.branch !== "all"
      ? req.query.branch
      : null;
    const branch = isSuperAdmin ? requestedBranch : req.user.branch;

    if (!isSuperAdmin && !branch) {
      return res.status(403).json({ message: "Your branch is not configured." });
    }
    if (branch && !VALID_BRANCHES.includes(branch)) {
      return res.status(400).json({ message: "Unknown branch." });
    }

    const { from, elapsedTo } = currentMonthRange();
    const workingDays = allDaysSoFar(from, elapsedTo).filter(isWorkingDay);

    const cacheKey = branch
      ? `attendanceAnalytics:${branch}:${isoDateStr(from).slice(0, 7)}`
      : `attendanceAnalytics:ALL:${isoDateStr(from).slice(0, 7)}`;

    const data = await getOrSetDeduped(cacheKey, CACHE_TTL_SECONDS, async () => {
      if (branch) {
        const view = await buildBranchView(branch, from, elapsedTo, workingDays);
        delete view._summary;
        delete view._dailyTrend;
        return view;
      }
      return buildSuperadminView(from, elapsedTo, workingDays);
    });

    return res.json(data);
  } catch (err) {
    console.error("getAttendanceAnalytics error:", err);
    return res.status(500).json({ message: "Failed to load attendance analytics." });
  }
};

// ── Controller: export ─────────────────────────────────────────────────
// [NEW-EXPORT]
// Branch-scoped only — "all" is explicitly rejected.
// Rationale: consistent with exportVehicleLogs and exportTechnicianData.
// Superadmin selects a branch pill first, then exports that branch.
//
// No cache — exports always get fresh data. An admin should never
// download a CSV that's 60 seconds stale without knowing it.
//
// Returns the full technicians array including markBuckets so the
// client can build a detailed CSV without a second request.
const getAttendanceExport = async (req, res) => {
  try {
    const isSuperAdmin    = req.user.role === "superadmin";
    const requestedBranch = req.query.branch && req.query.branch !== "all"
      ? req.query.branch
      : null;
    const branch = isSuperAdmin ? requestedBranch : req.user.branch;

    if (!branch) {
      return res.status(400).json({
        message: "A specific branch is required for export. Select a branch from the filter first.",
      });
    }
    if (!VALID_BRANCHES.includes(branch)) {
      return res.status(400).json({ message: "Unknown branch." });
    }

    // Branch admin scope guard — mirrors adminController pattern
    if (!isSuperAdmin && branch !== req.user.branch) {
      return res.status(403).json({
        message: "Access denied: you can only export your own branch.",
      });
    }

    const { from, elapsedTo } = currentMonthRange();
    const workingDays = allDaysSoFar(from, elapsedTo).filter(isWorkingDay);

    // No cache wrapper — always fresh
    const { technicians, attendance, entries } = await fetchBranchSlice(branch, from, elapsedTo);
    const technicianRows = computeTechnicianStats(technicians, attendance, entries, workingDays.length);

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    return res.json({
      branch,
      month,
      workingDaysSoFar: workingDays.length,
      technicians:      technicianRows,
      totalCount:       technicianRows.length,
    });
  } catch (err) {
    console.error("getAttendanceExport error:", err);
    return res.status(500).json({ message: "Failed to export attendance data." });
  }
};

module.exports = { getAttendanceAnalytics, getAttendanceExport };