const Entry  = require("../models/Entry");
const User   = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");

const VALID_TYPES = [
  "MECHANIC",
  "MECHANIC HELPER",
  "ELECTRICIAN",
  "ELECTRICIAN HELPER",
];

// ─── Token ────────────────────────────────────────────────────────────────────
// technicianType is now baked into the JWT alongside branch.
// Consequence: if type changes (it shouldn't after being set once), user must re-login.
const generateToken = (user) =>
  jwt.sign(
    {
      userId:          user._id,
      role:            user.role,
      profileComplete: user.profileComplete,
      branch:          user.branch,
      technicianType:  user.technicianType ?? null, // ← NEW
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ─── Shared response shape ────────────────────────────────────────────────────
// Single source of truth — every auth endpoint returns this exact shape.
// Adding a field here automatically propagates to signup, login, profile-setup, type-setup.
const userPayload = (user) => ({
  id:              user._id,
  name:            user.name,
  email:           user.email,
  role:            user.role,
  profileComplete: user.profileComplete,
  branch:          user.branch,
  technicianId:    user.technicianId,
  technicianType:  user.technicianType ?? null, // ← NEW
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name, email, password: hashed });
    const token  = generateToken(user);

    res.status(201).json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    // Branch admin safety check — block misconfigured accounts at login
    if (user.role === "admin") {
      const b = user.branch;
      if (!b || b.trim() === "" || b.toLowerCase() === "all") {
        return res.status(403).json({
          message:
            "Your admin account is not fully configured. Please contact your developer to set your branch.",
        });
      }
    }

    const token = generateToken(user);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/auth/profile-setup  (protect required) ─────────────────────────
// NEW technicians only — first login, profileComplete: false.
// Now also collects technicianType in the same single submission.
// After this, both profileComplete: true AND technicianType are set.
const profileSetup = async (req, res) => {
  try {
    // Admin/superadmin are configured directly in MongoDB — never via this route
    if (["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Admin accounts are configured by the developer directly.",
      });
    }

    const { technicianId, name, branch, technicianType } = req.body;

    if (!technicianId || !name || !branch || !technicianType)
      return res.status(400).json({ message: "All 4 fields are required" });

    if (!VALID_TYPES.includes(technicianType))
      return res.status(400).json({ message: "Invalid technician type selected" });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { technicianId, name, branch, profileComplete: true, technicianType },
      { new: true }
    );

    // Fresh token — now carries profileComplete: true, branch, AND technicianType
    const token = generateToken(user);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/auth/type-setup  (protect required) ────────────────────────────
// EXISTING technicians only — profileComplete: true, but technicianType: null.
// This is a one-time migration path for users who completed profile before
// technicianType existed. After calling this, the modal never appears again.
//
// Also backfills ALL historical entries for this user — no data loss.
const typeSetup = async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({ message: "Only technicians can use this route." });
    }

    const { technicianType } = req.body;

    if (!technicianType || !VALID_TYPES.includes(technicianType)) {
      return res.status(400).json({ message: "Please select a valid technician type." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { technicianType },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Backfill all existing entries for this user with their chosen type.
    // This is the moment all historical entries get their technicianType stamped.
    await Entry.updateMany(
      { userId: req.user.userId },
      { $set: { technicianType } }
    );

    // Fresh token — now carries technicianType, modal will not appear again
    const token = generateToken(user);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/auth/me  (protect required) ─────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signup, login, profileSetup, typeSetup, getMe };