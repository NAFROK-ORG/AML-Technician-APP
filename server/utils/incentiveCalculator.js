/**
 * Ashok Leyland — Technician Incentive Calculator
 * FY 2026-27 Q1 | CG & UP Region
 *
 * Tier mapping:
 *   MECHANIC + ELECTRICIAN          → Mechanic tier  (cap ₹10,000)
 *   MECHANIC HELPER + ELECTRICIAN HELPER → Helper tier (cap ₹7,000)
 *
 * Slab rules:
 *   - BOTH hours AND labour must be strictly exceeded (>) for a slab to apply.
 *   - Slabs are evaluated highest-first; first match wins.
 *   - Slab 4 = Slab-3 base + ₹150 (mechanic) / ₹100 (helper) per extra ₹1,000
 *     in labour above the Slab-4 labour threshold.
 *
 * Leave multiplier (applied to the full slab incentive):
 *   0 – 2 days  → 100%
 *   2 – 3 days  → 70%
 *   > 3 days    → Nil
 *
 * No-Leave Bonus (separate add-on, strictly zero leaves):
 *   Mechanic tier — totalLeave === 0 AND hours >= 100 AND labour >= ₹47,500 → +₹1,500
 *   Helper tier   — totalLeave === 0 AND hours >=  60 AND labour >= ₹28,500 → +₹1,000
 *   Added AFTER the leave multiplier. Cap applied to (slab after multiplier + bonus).
 */

// ── Tier membership ──────────────────────────────────────────────────────────
const MECHANIC_TYPES = ["MECHANIC", "ELECTRICIAN"];
const HELPER_TYPES   = ["MECHANIC HELPER", "ELECTRICIAN HELPER"];

// ── Slab definitions ─────────────────────────────────────────────────────────
// index 0 = Slab 1, index 1 = Slab 2, index 2 = Slab 3, index 3 = Slab 4
// minHours / minLabour are STRICT lower bounds (totalX must be > threshold).
// Slab 4 has incentive: null because it is computed, not fixed.

const MECHANIC_SLABS = [
  { slab: 1, minHours: 100, minLabour: 47500, incentive: 2000, bonusPer1k: null, slabBase: null },
  { slab: 2, minHours: 120, minLabour: 57500, incentive: 3000, bonusPer1k: null, slabBase: null },
  { slab: 3, minHours: 150, minLabour: 72500, incentive: 5000, bonusPer1k: null, slabBase: null },
  { slab: 4, minHours: 175, minLabour: 85000, incentive: null, bonusPer1k: 150,  slabBase: 5000 },
];

const HELPER_SLABS = [
  { slab: 1, minHours:  60, minLabour: 28500, incentive: 1500, bonusPer1k: null, slabBase: null },
  { slab: 2, minHours:  75, minLabour: 36000, incentive: 2000, bonusPer1k: null, slabBase: null },
  { slab: 3, minHours: 100, minLabour: 48500, incentive: 3500, bonusPer1k: null, slabBase: null },
  { slab: 4, minHours: 120, minLabour: 58500, incentive: null, bonusPer1k: 100,  slabBase: 3500 },
];

const MAX_INCENTIVE = { mechanic: 10000, helper: 7000 };

// ── No-Leave Bonus config ────────────────────────────────────────────────────
// Applied only when totalLeave === 0 (strictly zero, not "0–2").
// Thresholds are INCLUSIVE (>=), different from slab thresholds which are strict (>).
const NO_LEAVE_BONUS = {
  mechanic: { minHours: 100, minLabour: 47500, amount: 1500 },
  helper:   { minHours:  60, minLabour: 28500, amount: 1000 },
};

// ── Tier resolver ─────────────────────────────────────────────────────────────
/**
 * @param {string|null} technicianType
 * @returns {"mechanic"|"helper"|null}
 */
function resolveTier(technicianType) {
  if (MECHANIC_TYPES.includes(technicianType)) return "mechanic";
  if (HELPER_TYPES.includes(technicianType))   return "helper";
  return null;
}

// ── Main calculator ───────────────────────────────────────────────────────────
/**
 * Calculates monthly incentive eligibility.
 *
 * @param {number}      totalHours     - Aggregate hoursWorked for the month
 * @param {number}      totalLabour    - Aggregate labourAmount for the month
 * @param {number}      totalLeave     - Aggregate leaveDays for the month
 * @param {string|null} technicianType - MECHANIC | MECHANIC HELPER | ELECTRICIAN | ELECTRICIAN HELPER | null
 *
 * @returns {{
 *   tier:            "mechanic"|"helper"|"unknown",
 *   slabNumber:      number,    // 0 = no slab, 1–4
 *   baseIncentive:   number,    // full slab payout before multiplier (Slab 4 includes bonus)
 *   slab4Bonus:      number,    // variable bonus component for Slab 4, 0 for all others
 *   leaveMultiplier: number,    // 1.0 | 0.7 | 0
 *   leaveTier:       string,
 *   noLeaveBonus:    number,    // 1500 (mechanic) or 1000 (helper) if zero leaves + threshold met, else 0
 *   finalIncentive:  number,    // after multiplier + cap
 *   isCapped:        boolean,
 *   maxIncentive:    number,    // 10000 | 7000 | 0
 *   nextSlab:        object|null
 * }}
 */
function calculateIncentive(totalHours, totalLabour, totalLeave, technicianType) {

  // ── 0. Unknown / unset type → safe zero return ────────────────────────────
  const tier = resolveTier(technicianType);
  if (!tier) {
    return {
      tier:            "unknown",
      slabNumber:      0,
      baseIncentive:   0,
      slab4Bonus:      0,
      leaveMultiplier: 0,
      leaveTier:       "N/A",
      noLeaveBonus:    0,
      finalIncentive:  0,
      isCapped:        false,
      maxIncentive:    0,
      nextSlab:        null,
    };
  }

  const slabs = tier === "mechanic" ? MECHANIC_SLABS : HELPER_SLABS;
  const cap   = MAX_INCENTIVE[tier];

  // ── 1. Slab determination (highest-first) ────────────────────────────────
  //
  // Check Slab 4 separately because its incentive is computed, not fixed.
  // Then walk down 3 → 1 for fixed-amount slabs.
  //
  // Both thresholds must be strictly exceeded (>) — matching policy notation.

  let slabNumber    = 0;
  let baseIncentive = 0;
  let slab4Bonus    = 0;

  const s4 = slabs[3]; // Slab 4 is always index 3

  if (totalHours > s4.minHours && totalLabour > s4.minLabour) {
    // ── Slab 4 ──────────────────────────────────────────────────────────────
    // Bonus = ₹150 (mechanic) or ₹100 (helper) for every complete ₹1,000
    // in labour above the Slab-4 labour threshold.
    slab4Bonus    = Math.floor((totalLabour - s4.minLabour) / 1000) * s4.bonusPer1k;
    baseIncentive = s4.slabBase + slab4Bonus;
    slabNumber    = 4;

  } else {
    // ── Slabs 3 → 1 ─────────────────────────────────────────────────────────
    for (let i = 2; i >= 0; i--) {
      const s = slabs[i];
      if (totalHours > s.minHours && totalLabour > s.minLabour) {
        slabNumber    = s.slab;
        baseIncentive = s.incentive;
        break;
      }
    }
  }

  // ── 2. Leave multiplier ──────────────────────────────────────────────────
  let leaveMultiplier;
  let leaveTier;

  if (totalLeave <= 2) {
    leaveMultiplier = 1.0;
    leaveTier       = "0–2 days (100%)";
  } else if (totalLeave <= 3) {
    leaveMultiplier = 0.7;
    leaveTier       = "2–3 days (70%)";
  } else {
    leaveMultiplier = 0;
    leaveTier       = ">3 days (Nil)";
  }

  // ── 3. No-Leave Bonus ────────────────────────────────────────────────────
  // Conditions (all three must be true):
  //   a) totalLeave === 0  — strictly zero, the bonus title is "ZERO LEAVES"
  //   b) totalHours  >= threshold  — inclusive, per policy (>=)
  //   c) totalLabour >= threshold  — inclusive, per policy (>=)
  // This is a separate add-on; it is NOT multiplied by the leave multiplier
  // (since the multiplier is always 1.0 when leaves === 0 anyway).
  const noBonusCfg  = NO_LEAVE_BONUS[tier];
  const noLeaveBonus =
    totalLeave === 0 &&
    totalHours  >= noBonusCfg.minHours &&
    totalLabour >= noBonusCfg.minLabour
      ? noBonusCfg.amount
      : 0;

  // ── 4. Apply multiplier → add bonus → cap ────────────────────────────────
  const slabAfterMultiplier = Math.round(baseIncentive * leaveMultiplier);
  const preCap              = slabAfterMultiplier + noLeaveBonus;
  const finalIncentive      = Math.min(preCap, cap);
  const isCapped            = preCap > cap;

  // ── 5. Next slab to aim for ──────────────────────────────────────────────
  // slabs is 0-indexed; slabNumber is 1-indexed.
  // slabs[slabNumber] therefore always points to the NEXT slab naturally.
  // e.g. slabNumber=0 → slabs[0] = Slab 1 definition
  //      slabNumber=2 → slabs[2] = Slab 3 definition
  //      slabNumber=4 → null (already at top)
  const nextSlab = slabNumber < 4 ? slabs[slabNumber] : null;

  return {
    tier,
    slabNumber,
    baseIncentive,
    slab4Bonus,
    leaveMultiplier,
    leaveTier,
    noLeaveBonus,
    finalIncentive,
    isCapped,
    maxIncentive:   cap,
    nextSlab,
  };
}

module.exports = {
  calculateIncentive,
  resolveTier,
  MECHANIC_SLABS,
  HELPER_SLABS,
  MAX_INCENTIVE,
  NO_LEAVE_BONUS,
  MECHANIC_TYPES,
  HELPER_TYPES,
};