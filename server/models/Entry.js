const mongoose = require("mongoose");

const TECHNICIAN_TYPES = [
  "MECHANIC",
  "MECHANIC HELPER",
  "ELECTRICIAN",
  "ELECTRICIAN HELPER",
];

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    branch: {
      type:     String,
      required: true,
    },
    technicianType: {
      type:    String,
      enum:    [null, ...TECHNICIAN_TYPES],
      default: null,
    },
    date: {
      type:     Date,
      required: [true, "Date is required"],
      default:  Date.now,
    },
    category: {
      type:     String,
      required: [true, "Category is required"],
      enum: [
        "ENGINE REPAIR",
        "GEAR BOX",
        "ELECTRICAL",
        "BODY WORK",
        "DIFFERENTIAL",
        "TRANSMISSION",
        "AC & COOLING",
        "EATS FLUSHING",
        "GENERAL SERVICE",
        "SCHEDULE SERVICE",
      ],
    },
    vehicleNo: {
      type:    String,
      trim:    true,
      default: "",
      // Stored as entered by technician (original format).
      // New entries (post security-feature deploy): vehicleNo is required
      // and vehicleNoNorm is always populated.
      // Old entries: vehicleNo may be "" and vehicleNoNorm is absent — correct,
      // since there were no security logs then. Old entries are permanently
      // excluded from linking queries (which filter by vehicleNoNorm).
    },
    vehicleNoNorm: {
      type: String,
      // Optional — only populated for entries created AFTER this feature deploys.
      // Old entries: field is absent / undefined. They are NEVER touched by this
      // change and remain fully accessible for all existing features.
      //
      // Do NOT add required: true — that would cause issues with old documents
      // in some Mongoose versions and would be incorrect semantically.
      //
      // This field is used exclusively for the SecurityLog linking algorithm.
      // It is always normalizeVehicleNo(vehicleNo) — computed in entryController,
      // never accepted from req.body.
      //
      // Linking query: { vehicleNoNorm: log.vehicleNoNorm, branch: log.branch,
      //                  createdAt: { $gte: log.loggedAt, $lt: nextLog?.loggedAt } }
    },
    jcNo: {
      type:     String,
      required: [true, "JC Number is required"],
      trim:     true,
    },
    labourAmount: {
      type:     Number,
      required: true,
      min:      [0,      "Labour amount cannot be negative"],
      max:      [100000, "Labour amount cannot exceed ₹1,00,000 per entry"],
      default:  0,
    },
    hoursWorked: {
      type:     Number,
      required: true,
      min:      [0,  "Hours worked cannot be negative"],
      max:      [24, "Hours worked cannot exceed 24 per entry"],
      default:  0,
    },
    leaveDays: {
      type:     Number,
      required: true,
      min:      [0,  "Leave days cannot be negative"],
      max:      [31, "Leave days cannot exceed 31 per entry"],
      default:  0,
    },
    incentive: {
      type:    Number,
      min:     0,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ─── Indexes ──────────────────────────────────────────────────────────────────
   Existing indexes (unchanged):
   { branch: 1 }          — admin branch-scoped aggregations
   { userId: 1 }          — kept for backward compat / populate calls
   { technicianType: 1 }  — analytics grouping by technician type
   { vehicleNo: 1 }       — legacy vehicle search support

   ── NEW (additive only — Atlas builds in background, zero downtime) ──────────

   { vehicleNoNorm: 1, branch: 1, createdAt: 1 }
   Covers the batched security-linking query in getBoardLogs:
     Entry.find({ vehicleNoNorm: { $in: [...] }, branch, createdAt: { $gte: ... } })
   Without this, every board load was a full collection scan on vehicleNoNorm
   (an unindexed field). With it, MongoDB narrows to exact vehicle+branch sets
   and range-scans createdAt within those. Immediate improvement on busy days.

   { userId: 1, date: -1 }
   Covers two hot read paths:
     1. getTechnicianEntries  → find({ userId }).sort({ date: -1 }).skip().limit()
        Index now drives both the match AND the sort — no in-memory sort stage.
     2. getAdminAttendance + getMonthlyIncentive
        → find({ userId: { $in: [...] }, date: { $gte, $lt } })
        MongoDB range-scans date per userId instead of loading all user entries
        and filtering in memory.
   MongoDB can traverse this index in either direction, so date ASC queries
   (rare but present in analytics) also benefit.
─────────────────────────────────────────────────────────────────────────────── */

entrySchema.index({ branch: 1 });
entrySchema.index({ userId: 1 });
entrySchema.index({ technicianType: 1 });
entrySchema.index({ vehicleNo: 1 });
entrySchema.index({ vehicleNoNorm: 1, branch: 1, createdAt: 1 }); // ← NEW: security linking
entrySchema.index({ userId: 1, date: -1 });                        // ← NEW: pagination + date-range
entrySchema.index({ branch: 1, date: 1 });                         // ← NEW: getAnalytics + getBranchDashboard — both filter {branch, date} together, every call
entrySchema.index({ date: 1 });                                    // ← NEW: superadmin "All Branches" analytics — date-only filter, branch absent           // ← NEW: pagination + date-range

module.exports = mongoose.model("Entry", entrySchema);