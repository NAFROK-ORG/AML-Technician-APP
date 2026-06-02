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
      // Old entries: null after migration, backfilled when user selects their type.
      // New entries: always a real value — createEntry blocks if user.technicianType is null.
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
    },
    jcNo: {
      type:     String,
      required: [true, "JC Number is required"],
      trim:     true,
    },
    labourAmount: {
      type:     Number,
      required: true,
      min:      0,
      default:  0,
    },
    hoursWorked: {
      type:     Number,
      required: true,
      min:      0,
      default:  0,
    },
    leaveDays: {
      type:     Number,
      required: true,
      min:      0,
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
entrySchema.index({ technicianType: 1 }); // admin type-filter queries

module.exports = mongoose.model("Entry", entrySchema);