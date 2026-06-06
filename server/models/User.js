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
      // HARDENING: maxlength prevents oversized strings reaching the DB.
      // 100 chars is generous for a real name; no legitimate user hits this.
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      // HARDENING: maxlength on email — RFC 5321 caps the local part at 64 chars
      // and the total address at 254 chars. 254 is the correct limit.
      maxlength: [254, "Email address is too long"],
      // HARDENING: basic format check. Rejects missing @, missing domain, etc.
      // Not a full RFC 5322 parser — just stops obvious garbage from entering the DB.
      // The regex allows: local@domain.tld, sub+tag@sub.domain.co.uk
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: 6,
      // HARDENING: select: false means password hash is NEVER returned by default
      // on any User query. This prevents accidental exposure in API responses.
      //
      // ⚠ ACTION REQUIRED: Your authController login handler must explicitly
      // request the password field when verifying credentials, like this:
      //
      //   const user = await User.findOne({ email }).select('+password');
      //   const match = await bcrypt.compare(plainPassword, user.password);
      //
      // If your login controller does NOT already have .select('+password'),
      // login will break (user.password will be undefined → bcrypt.compare fails).
      // Check and update authController.js before deploying this change.
      select: false,
    },
    role: {
      type:    String,
      enum:    ["technician", "admin", "superadmin"],
      default: "technician",
    },
    technicianId: {
      type:      String,
      default:   "",
      trim:      true,
      // HARDENING: technicianId is an internal identifier, not user-supplied content,
      // but maxlength prevents any edge-case oversized input.
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