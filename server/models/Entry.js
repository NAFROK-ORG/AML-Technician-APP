const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    category: {
      type: String,
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
      type: String,
      trim: true,
      default: "",
    },
    jcNo: {
      type: String,
      required: [true, "JC Number is required"],
      trim: true,
    },
    labourAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    hoursWorked: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    leaveDays: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    incentive: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for fast branch queries (admin dashboard)
entrySchema.index({ branch: 1 });
// Index for fast user queries (technician dashboard)
entrySchema.index({ userId: 1 });

module.exports = mongoose.model("Entry", entrySchema);
