const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * generateToken
 *
 * IMPORTANT: branch is now baked into the JWT payload.
 * This is what allows adminController to scope queries to req.user.branch
 * without an extra DB round-trip on every request.
 *
 * Consequence: if a user's branch changes in MongoDB, they must re-login
 * to get a fresh token. This is intentional and correct — branch is
 * set once by the developer and never changes.
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId:          user._id,
      role:            user.role,
      profileComplete: user.profileComplete,
      branch:          user.branch, // ← NEW: needed for branch-admin scoping
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// POST /api/auth/signup
// Everyone signs up as a technician. Role is elevated manually in MongoDB.
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashed });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id:              user._id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        profileComplete: user.profileComplete,
        branch:          user.branch,
        technicianId:    user.technicianId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
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

    /**
     * Branch admin safety check at login time.
     * If the developer promoted someone to "admin" but forgot to set their branch,
     * block them here with a clear message instead of letting them in with broken scope.
     */
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

    res.json({
      token,
      user: {
        id:              user._id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        profileComplete: user.profileComplete,
        branch:          user.branch,
        technicianId:    user.technicianId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/auth/profile-setup  (protect required)
// Used only by technicians on first login. Admin/superadmin accounts are
// configured directly in MongoDB — they never go through this route.
const profileSetup = async (req, res) => {
  try {
    // Guard: admins and superadmins must not call this route
    if (["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Admin accounts are configured by the developer directly.",
      });
    }

    const { technicianId, name, branch } = req.body;

    if (!technicianId || !name || !branch)
      return res.status(400).json({ message: "All 3 fields are required" });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { technicianId, name, branch, profileComplete: true },
      { new: true }
    );

    // Fresh token — now carries profileComplete: true and the chosen branch
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id:              user._id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        profileComplete: user.profileComplete,
        branch:          user.branch,
        technicianId:    user.technicianId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me  (protect required)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signup, login, profileSetup, getMe };