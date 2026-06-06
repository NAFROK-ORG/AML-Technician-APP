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
      // Copied from User.branch at creation. Immutable after create.
    },
    technicianType: {
      type:    String,
      enum:    [null, ...TECHNICIAN_TYPES],
      default: null,
      // Copied from User.technicianType at entry creation — never from req.body.
    },
    date: {
      type:     Date,
      required: [true, "Date is required"],
      default:  Date.now,
      // Always set server-side in createEntry (new Date()).
      // Never accepted from req.body — prevents backdating and forward-dating.
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
      // Optional — not all job cards are vehicle-specific.
      // Stored as "" (empty string) when not provided, never null.
      // This means sparse: false is correct on the index below —
      // sparse only skips null/missing fields, and "" is a real value
      // that would be indexed anyway. A regular index is correct here.
    },
    jcNo: {
      type:     String,
      required: [true, "JC Number is required"],
      trim:     true,
    },
    // FIX Bug 8: Added max validators to all three numeric fields.
    // Without these, a technician could submit hoursWorked: 9999 and instantly
    // vault to Slab 3, or leaveDays: 100 and zero out their entire incentive.
    // These schema validators fire for ALL write paths (create + findByIdAndUpdate
    // with runValidators: true), providing a consistent safety net at the DB layer
    // in addition to the controller-level bounds checks in entryController.js.
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

   All indexes here are purely additive — they never modify document data,
   never break existing queries, and are built by MongoDB Atlas in the
   background without locking the collection. Safe to deploy to production.

   Existing indexes (already in production):
   ─────────────────────────────────────────
   { branch: 1 }          — admin branch-scoped queries (getEntries, getAnalytics)
   { userId: 1 }          — technician's own entry list
   { technicianType: 1 }  — analytics grouping by type

   New index:
   ──────────
   { vehicleNo: 1 }
   ─ WHY: vehicleNo is now used in vehicle search (GET /api/search/vehicle).
   ─ WHY NOT sparse: vehicleNo defaults to "" — every document has this field
     as a real value (even if empty string). sparse: true only skips null/missing
     fields, so it would index all documents anyway. Regular index is correct.
   ─ REGEX LIMITATION: The current buildVehicleRegex() produces patterns without
     a ^ anchor, so MongoDB's query planner cannot use this index for the regex
     filter. At current scale (~12,500 entries/year for 50 technicians), a
     collection scan on this field is sub-millisecond — not a concern right now.
     This index does benefit future exact-match queries on vehicleNo if added later.
   ─ SAFETY: Zero risk to existing data or queries. Mongoose calls ensureIndexes()
     at startup — if the index already exists, it's a no-op. If new, Atlas builds
     it in the background while the collection remains fully accessible.

   ─────────────────────────────────────────────────────────────────────────────── */

entrySchema.index({ branch: 1 });
entrySchema.index({ userId: 1 });
entrySchema.index({ technicianType: 1 });
entrySchema.index({ vehicleNo: 1 }); // vehicle search support — see note above

module.exports = mongoose.model("Entry", entrySchema);