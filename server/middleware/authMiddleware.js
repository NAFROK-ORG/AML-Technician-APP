const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect — JWT verification + live DB user fetch.
 *
 * WHY the DB call:
 *   Without it, req.user comes entirely from the JWT payload minted at login.
 *   That means:
 *     • A deleted user keeps API access until the token expires.
 *     • A superadmin whose role is downgraded to technician still hits admin routes.
 *     • A branch admin whose branch changes still queries the old branch.
 *
 *   The DB fetch makes all three impossible — every request reflects live state.
 *
 * WHAT IS EXPOSED TO CONTROLLERS (req.user shape — unchanged from before):
 *   {
 *     userId:          ObjectId  — same as before (mapped from _id)
 *     role:            String    — live from DB
 *     branch:          String    — live from DB
 *     profileComplete: Boolean   — live from DB
 *     technicianType:  String|null — live from DB
 *     name:            String    — available if controllers ever need it
 *   }
 *
 *   All existing controllers that use req.user.userId, req.user.role,
 *   req.user.branch, req.user.profileComplete continue to work unchanged.
 *
 * PERFORMANCE:
 *   One indexed _id lookup per request. MongoDB _id is always the primary
 *   index — this is sub-millisecond at any realistic scale.
 *   The .select() call limits the fetched payload to only the fields needed.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token, authorization denied" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Live DB fetch — rejects deleted/demoted users immediately.
    // .select("-password") ensures the password hash is never loaded into memory.
    const user = await User.findById(decoded.userId).select("-password").lean();

    if (!user) {
      // User was deleted after this token was issued.
      return res.status(401).json({ message: "Account no longer exists." });
    }

    // Normalize req.user to match the shape all controllers already expect.
    // 'userId' is the alias for _id that controllers use throughout.
    req.user = {
      userId:          user._id,
      role:            user.role,
      branch:          user.branch,
      profileComplete: user.profileComplete,
      technicianType:  user.technicianType,
      name:            user.name,
    };

    next();
  } catch (err) {
    // jwt.verify throws on expiry, invalid signature, malformed token, etc.
    res.status(401).json({ message: "Token invalid or expired" });
  }
};

module.exports = { protect };