const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["DELETE_ENTRY", "EDIT_ENTRY"],
      required: true,
    },

    // Who performed the action — from JWT, never from request body
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedByName:   { type: String, required: true },
    performedByRole:   { type: String, required: true },
    performedByBranch: { type: String, required: true },

    // The entry that was affected — stored as STRING not ObjectId ref
    // because if the entry is deleted, the ref would be broken
    entryId: { type: String, required: true },

    // Full snapshot of the entry AS IT WAS before the action.
    // This is the recovery point — if the entry is deleted from MongoDB,
    // this snapshot still contains every field.
    entrySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // For EDIT_ENTRY: what exactly changed (old value → new value)
    // For DELETE_ENTRY: null
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Target technician info (denormalized for display — don't rely on JOIN)
    targetUserId:        { type: String, required: true },
    targetUserName:      { type: String, required: true },
    targetTechnicianId:  { type: String, default: "" },
    targetBranch:        { type: String, required: true },

    // Extra context
    ipAddress: { type: String, default: "" }, // req.ip — for forensics
  },
  { timestamps: true } // createdAt = exact time of action
);

// Compound indexes for fast paginated reads
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetBranch: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);