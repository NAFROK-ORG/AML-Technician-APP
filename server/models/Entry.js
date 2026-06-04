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

entrySchema.index({ branch: 1 });
entrySchema.index({ userId: 1 });
entrySchema.index({ technicianType: 1 });

module.exports = mongoose.model("Entry", entrySchema);