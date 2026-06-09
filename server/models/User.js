const mongoose = require("mongoose");

// Shared constant — keeps User and Entry in sync without circular imports.
const TECHNICIAN_TYPES = [
  "MECHANIC",
  "MECHANIC HELPER",
  "ELECTRICIAN",
  "ELECTRICIAN HELPER",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      maxlength: [254, "Email address is too long"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: 6,
      select:    false,
    },
    role: {
      type:    String,
      // ── CHANGE: added "security" to enum ─────────────────────────────────
      // Risk: Zero — additive only. Existing users are unaffected.
      // Default is still "technician".
      // Security users are created by developer via MongoDB update:
      //   db.users.updateOne(
      //     { email: "security@amlmotors.com" },
      //     { $set: { role: "security", branch: "BALLARI", profileComplete: true } }
      //   )
      // ─────────────────────────────────────────────────────────────────────
      enum:    ["technician", "admin", "superadmin", "security"],
      default: "technician",
    },
    technicianId: {
      type:      String,
      default:   "",
      trim:      true,
      maxlength: [50, "Technician ID cannot exceed 50 characters"],
    },
    branch: {
      type:      String,
      default:   "",
      trim:      true,
      maxlength: [100, "Branch name cannot exceed 100 characters"],
    },
    profileComplete: {
      type:    Boolean,
      default: false,
    },
    technicianType: {
      type:    String,
      enum:    [null, ...TECHNICIAN_TYPES],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);