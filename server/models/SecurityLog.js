const mongoose = require("mongoose");

/**
 * SecurityLog — one record per vehicle logged by a security user at the gate.
 *
 * Two timestamp fields (by design — do not collapse into one):
 *   date      → utcMidnight() bucket. Used for date-based board queries.
 *   loggedAt  → exact new Date() at creation. Used by the linking algorithm.
 *
 * Two vehicle number fields (by design — do not remove either):
 *   vehicleNo     → stored as entered (original format preserved for display)
 *   vehicleNoNorm → normalized: uppercase, hyphens/spaces stripped.
 *                   ALL linking queries use vehicleNoNorm — never vehicleNo.
 *                   Must be recomputed on every PUT that changes vehicleNo.
 */
const securityLogSchema = new mongoose.Schema(
  {
    vehicleNo: {
      type:     String,
      required: [true, "Vehicle number is required"],
      trim:     true,
      // Stored as the security user entered it — for display only.
      // Examples: "KA-01-AB-1234", "KA01AB1234", "ka 01 ab 1234"
    },
    vehicleNoNorm: {
      type:     String,
      required: true,
      // Always normalizeVehicleNo(vehicleNo).
      // This is what every linking query runs against.
      // If a PUT changes vehicleNo, vehicleNoNorm MUST be recomputed.
      // Silently stale vehicleNoNorm = silently broken linking forever.
    },
    branch: {
      type:     String,
      required: true,
      // Read from User.findById(req.user.userId).branch at log time.
      // NEVER from req.body — same pattern as Entry.branch and Attendance.branch.
    },
    loggedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      // The security user's _id.
    },
    date: {
      type:     Date,
      required: true,
      // utcMidnight() normalized — calendar day bucket.
      // Used for: board "show me all logs for June 9th" queries.
    },
    loggedAt: {
      type:     Date,
      required: true,
      // Exact new Date() at controller time — NEVER from client.
      // Used for: linking algorithm (which entry belongs to which visit).
      // Rule 3: entry.createdAt >= securityLog.loggedAt
      // Rule 4: entry.createdAt <  nextLog.loggedAt
    },
  },
  { timestamps: true }
);

/* ─── Indexes ────────────────────────────────────────────────────────────────

   { vehicleNoNorm: 1, branch: 1, loggedAt: 1 }
   Purpose: linking query — "find all logs for this vehicle+branch, sorted by
   time." Covers the board endpoint and the linking algorithm's nextLog lookup.

   { branch: 1, date: -1 }
   Purpose: admin board — "all logs for BALLARI on 2026-06-09". The date DESC
   keeps the most recent day first when listing without a specific date.

   { loggedBy: 1, date: -1 }
   Purpose: security dashboard — "my logs today".

   All three are additive — no existing collection touched.
   MongoDB Atlas builds them in the background without locking the collection.
─────────────────────────────────────────────────────────────────────────────── */

securityLogSchema.index({ vehicleNoNorm: 1, branch: 1, loggedAt: 1 });
securityLogSchema.index({ branch: 1, date: -1 });
securityLogSchema.index({ loggedBy: 1, date: -1 });

module.exports = mongoose.model("SecurityLog", securityLogSchema);