const mongoose = require("mongoose");

// Shared constant — keeps User and Entry in sync without circular imports.
// Also imported directly in controllers for validation.
const TECHNICIAN_TYPES = [
  "MECHANIC",
  "MECHANIC HELPER",
  "ELECTRICIAN",
  "ELECTRICIAN HELPER",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type:    String,
      enum:    ["technician", "admin", "superadmin"],
      default: "technician",
      // "superadmin" → branch: "all", set by developer
      // "admin"      → branch: "<BranchName>", set by developer
      // "technician" → default on signup
    },
    technicianId: {
      type:    String,
      default: "",
    },
    branch: {
      type:    String,
      default: "",
      // technician: set via profile-setup modal
      // admin:      set by developer (real branch name, never "all")
      // superadmin: set by developer as "all" (sentinel, never used in queries)
    },
    profileComplete: {
      type:    Boolean,
      default: false,
    },
    technicianType: {
      type:    String,
      // null is explicitly allowed — means "not yet selected"
      // The frontend TechnicianTypeModal blocks all entry logging until this is set.
      // The backend createEntry also rejects if this is null.
      enum:    [null, ...TECHNICIAN_TYPES],
      default: null,
      // Only applies to role: "technician". Ignored for admin/superadmin.
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);