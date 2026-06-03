const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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
    // UTC midnight of the calendar day — one record per technician per day
    date: {
      type:     Date,
      required: true,
    },
    // Exact timestamp the toggle was pressed
    markedAt: {
      type:     Date,
      required: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Enforces the one-time-per-day rule at the DB level (duplicate key = already marked)
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
// Fast branch + date queries for admin attendance page
attendanceSchema.index({ branch: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);

/*
  DESIGN NOTE
  ───────────
  Only "present" records are stored.
  "Absent" is derived: no record for a given date = absent.

  This keeps the collection lean and makes the monthly cron
  deletion trivial — it only ever touches this collection.

  The monthly cron (5th of each month, midnight) runs:
    Attendance.deleteMany({ date: { $lt: oneMonthAgo } })
  It cannot touch users or entries — it uses this model only.
*/