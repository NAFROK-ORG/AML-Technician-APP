/**
 * server/utils/timeUtils.js
 *
 * Single source of truth for all date/time logic in AML Motors.
 *
 * ── CONVENTION ────────────────────────────────────────────────────────
 *   Store   → UTC  (DB always stores UTC — never change stored data)
 *   Display → IST  (all charts, hour buckets, labels shown in IST)
 *
 * IST = UTC + 5:30  India does not observe DST — this offset never changes.
 *
 * ── WHAT THIS REPLACES ────────────────────────────────────────────────
 *   Before: utcMidnight() was copy-pasted in 4 controllers.
 *           IST_OFFSET_MS + istHour() lived only in attendanceAnalyticsController.
 *   After:  import from here. One change propagates everywhere.
 *
 * ── KNOWN SYSTEM CONSTRAINT (NOT a bug in this file) ─────────────────
 *   UTC midnight = 5:30 AM IST. Between 12:00 AM IST and 5:30 AM IST,
 *   utcMidnight() returns the PREVIOUS UTC calendar day. This affects
 *   attendance marks made in that window. Documented and accepted.
 *   Service centres operate 8 AM IST+, so this never fires in practice.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19,800,000 ms — constant forever

/**
 * utcMidnight
 * Normalises a Date (or today) to UTC 00:00:00.000.
 *
 * Used for calendar-day bucket keys in:
 *   Attendance.date, SecurityLog.date  ← always UTC midnight
 *   Entry.date is NOT utcMidnight — it uses new Date() intentionally.
 *   Never change that without reading the ghost-detection note in the handbook.
 */
function utcMidnight(input) {
  const d = input ? new Date(input) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * toISTHour
 * Extracts the IST hour (0–23) from any UTC Date or timestamp string.
 *
 * ALWAYS use this — never getUTCHours() directly — when you need an hour
 * value for display, charts, or bucket grouping.
 *
 * Example:
 *   09:00 IST = 03:30 UTC
 *   new Date("...T03:30:00Z").getUTCHours()  → 3   ← WRONG for display
 *   toISTHour("...T03:30:00Z")               → 9   ← CORRECT
 */
function toISTHour(date) {
  return new Date(new Date(date).getTime() + IST_OFFSET_MS).getUTCHours();
}

/**
 * toISTMinutesSinceMidnight
 * Total IST minutes elapsed since 00:00 IST (not UTC midnight).
 * Used for mark-time distribution and average mark-time calculations
 * in attendanceAnalyticsController.
 */
function toISTMinutesSinceMidnight(date) {
  const ist = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

module.exports = { IST_OFFSET_MS, utcMidnight, toISTHour, toISTMinutesSinceMidnight };