/**
 * Ashok Leyland — Technician Incentive Calculator
 * FY 2026-27 Q1 | Policy: Mechanics (Technicians) Only
 *
 * Rules:
 *  - BOTH hours AND labour thresholds must be met for a slab to apply.
 *    If only one is met → no slab, no incentive.
 *  - Slabs are checked highest-first; first match wins.
 *  - Leave multiplier is applied to the slab base amount.
 *  - No-Leave Bonus is separate and additive (only when leaveDays === 0).
 *  - Final incentive is capped at ₹10,000 per month.
 */

// Ordered highest → lowest so Array.find() returns the best eligible slab
const SLABS = [
  { slab: 3, minHours: 150, minLabour: 72500, incentive: 5000 },
  { slab: 2, minHours: 120, minLabour: 57500, incentive: 3000 },
  { slab: 1, minHours: 100, minLabour: 47500, incentive: 2000 },
];

const NO_LEAVE_BONUS = {
  minHours:  100,    // >= (inclusive)
  minLabour: 47500,  // >= (inclusive)
  amount:    1500,
};

const MAX_INCENTIVE = 10000;

/**
 * Calculates monthly incentive eligibility.
 *
 * @param {number} totalHours  - Aggregate hoursWorked for the month
 * @param {number} totalLabour - Aggregate labourAmount for the month
 * @param {number} totalLeave  - Aggregate leaveDays for the month
 * @returns {{
 *   slabNumber:      number,   // 0 = no slab, 1-3 = slab achieved
 *   baseIncentive:   number,   // slab payout before multiplier
 *   leaveMultiplier: number,   // 1.0 | 0.7 | 0
 *   leaveTier:       string,   // human-readable tier label
 *   noLeaveBonus:    number,   // 1500 or 0
 *   finalIncentive:  number,   // capped final amount
 *   isCapped:        boolean,  // true if MAX_INCENTIVE was hit
 *   nextSlab:        object|null  // next slab to aim for (null if maxed)
 * }}
 */
function calculateIncentive(totalHours, totalLabour, totalLeave) {
  // ── 1. Find highest slab where BOTH thresholds are met (strictly greater than)
  const eligibleSlab = SLABS.find(
    (s) => totalHours > s.minHours && totalLabour > s.minLabour
  ) ?? null;

  const slabNumber  = eligibleSlab?.slab     ?? 0;
  const baseIncentive = eligibleSlab?.incentive ?? 0;

  // ── 2. Leave multiplier
  //   0 – 2 days → 100%
  //   2 – 3 days → 70%
  //   > 3 days   → Nil
  let leaveMultiplier;
  let leaveTier;

  if (totalLeave <= 2) {
    leaveMultiplier = 1.0;
    leaveTier = "0–2 days (100%)";
  } else if (totalLeave <= 3) {
    leaveMultiplier = 0.7;
    leaveTier = "2–3 days (70%)";
  } else {
    leaveMultiplier = 0;
    leaveTier = ">3 days (Nil)";
  }

  // ── 3. No-Leave Bonus — additive, separate from slab
  //   Conditions: leaveDays === 0  AND  hours >= 100  AND  labour >= ₹47,500
  const noLeaveBonus =
    totalLeave === 0 &&
    totalHours  >= NO_LEAVE_BONUS.minHours &&
    totalLabour >= NO_LEAVE_BONUS.minLabour
      ? NO_LEAVE_BONUS.amount
      : 0;

  // ── 4. Final (cap at ₹10,000)
  const preCap = Math.round(baseIncentive * leaveMultiplier) + noLeaveBonus;
  const finalIncentive = Math.min(preCap, MAX_INCENTIVE);
  const isCapped = preCap > MAX_INCENTIVE;

  // ── 5. Next slab to aim for (useful for frontend progress display)
  const nextSlab = slabNumber < 3
    ? SLABS.find((s) => s.slab === slabNumber + 1) ?? null
    : null;

  return {
    slabNumber,
    baseIncentive,
    leaveMultiplier,
    leaveTier,
    noLeaveBonus,
    finalIncentive,
    isCapped,
    nextSlab,   // { slab, minHours, minLabour, incentive } or null
  };
}

module.exports = { calculateIncentive, SLABS, NO_LEAVE_BONUS, MAX_INCENTIVE };