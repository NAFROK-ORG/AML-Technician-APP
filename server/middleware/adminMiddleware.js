/**
 * adminMiddleware.js
 *
 * Guards, always used in this order on admin routes:
 *   protect → adminOrAbove → branchGuard → [superAdminOnly on specific routes]
 *
 * Security routes use a separate guard:
 *   protect → securityOnly
 *
 * NOTE: Optional chaining (?.) on req.user has been removed throughout.
 * protect() always runs before these guards and always sets req.user or
 * returns 401 — so req.user is guaranteed non-null here.
 */

// Passes if role is "admin" OR "superadmin". Blocks technicians and security.
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
 *
 * Do NOT use branchGuard on security routes. Security users have a real branch
 * (not "all"), so it would technically pass them, but mixing security into the
 * admin middleware chain is semantically wrong. Security routes use securityOnly.
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

/**
 * securityOnly — passes ONLY if role is "security".
 *
 * Used on all security user CRUD routes (POST /log, GET /today, PUT /log/:id).
 * Chain: protect → securityOnly (no branchGuard — it is for admin roles only).
 *
 * The board endpoint (GET /board) uses adminOrAbove + branchGuard instead,
 * because admins view the board — not security users.
 */
const securityOnly = (req, res, next) => {
  if (req.user.role !== "security") {
    return res.status(403).json({ message: "Access denied: Security role required" });
  }
  next();
};

module.exports = { adminOrAbove, superAdminOnly, branchGuard, securityOnly };