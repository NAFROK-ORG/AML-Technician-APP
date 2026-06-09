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
    // ── NEW FIELD ─────────────────────────────────────────────────────────────
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
    // ─────────────────────────────────────────────────────────────────────────
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
   { branch: 1 }          — admin branch-scoped queries
   { userId: 1 }          — technician's own entry list
   { technicianType: 1 }  — analytics grouping by type
   { vehicleNo: 1 }       — vehicle search support

   No new index for vehicleNoNorm — the linking queries use createdAt as the
   primary filter driver, and vehicleNoNorm is an equality match on a small
   result set (entries for one vehicle in one branch). At current scale this
   is fast. A compound index can be added later as a zero-risk additive change.
─────────────────────────────────────────────────────────────────────────────── */

entrySchema.index({ branch: 1 });
entrySchema.index({ userId: 1 });
entrySchema.index({ technicianType: 1 });
entrySchema.index({ vehicleNo: 1 });

module.exports = mongoose.model("Entry", entrySchema);