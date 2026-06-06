/**
 * adminMiddleware.js
 *
 * Three guards, always used in this order on admin routes:
 *   protect → adminOrAbove → branchGuard → [superAdminOnly on specific routes]
 *
 * NOTE: Optional chaining (?.) on req.user has been removed throughout.
 * protect() always runs before these guards and always sets req.user or
 * returns 401 — so req.user is guaranteed non-null here.
 * Keeping ?. was harmless but misleading (implies protect could be skipped).
 */

// Passes if role is "admin" OR "superadmin". Blocks technicians.
const adminOrAbove = (req, res, next) => {
  if (!["admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

// Passes ONLY if role is "superadmin". Used on cross-branch routes.
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Access denied: Super Admins only" });
  }
  next();
};

/**
 * branchGuard — runs after adminOrAbove.
 *
 * Superadmin: always passes (branch = "all" is their sentinel, not a real branch).
 * Branch admin: branch must be a non-empty string that is NOT "all".
 *   If empty or "all" → their account isn't configured yet → hard stop.
 *
 * This guard fires BEFORE any DB query so a misconfigured admin account
 * can never accidentally query across all branches.
 *
 * With the updated authMiddleware, req.user.branch is always live from the DB —
 * so a branch change takes effect on the very next request, no re-login needed.
 */
const branchGuard = (req, res, next) => {
  if (req.user.role === "admin") {
    const b = req.user.branch;
    if (!b || b.trim() === "" || b.toLowerCase() === "all") {
      return res.status(403).json({
        message:
          "Your branch is not configured. Please contact your developer.",
      });
    }
  }
  next();
};

module.exports = { adminOrAbove, superAdminOnly, branchGuard };