const AuditLog = require("../models/AuditLog");
const User     = require("../models/User");

/**
 * writeAuditLog
 * ─────────────────────────────────────────────────────────────────────────
 * Writes a single audit log entry. Designed to NEVER throw — if writing the
 * log fails (transient DB error etc.), it logs to console and resolves.
 * The calling delete/edit operation must NOT be blocked by audit failures —
 * the audit log is a safety net, not a gate.
 *
 * @param {object} params
 * @param {"DELETE_ENTRY"|"EDIT_ENTRY"} params.action
 * @param {object} params.req            - Express request (for req.user, req.ip)
 * @param {object} params.entrySnapshot  - Full entry doc (plain object) BEFORE the change
 * @param {object|null} params.changes   - For EDIT_ENTRY: { field: { from, to }, ... }
 * @param {object} params.targetUser     - The technician's User doc (lean ok) — owner of the entry
 */
async function writeAuditLog({ action, req, entrySnapshot, changes = null, targetUser }) {
  try {
    // performedByName: JWT payload may not always carry `name` depending on
    // when the token was issued. Fall back to a DB lookup if missing.
    let performedByName = req.user?.name;
    if (!performedByName) {
      const actor = await User.findById(req.user.userId).select("name").lean();
      performedByName = actor?.name || "Unknown";
    }

    await AuditLog.create({
      action,
      performedBy:        req.user.userId,
      performedByName,
      performedByRole:    req.user.role,
      performedByBranch:  req.user.branch || (req.user.role === "superadmin" ? "SUPERADMIN" : ""),
      entryId:            String(entrySnapshot._id),
      entrySnapshot,
      changes,
      targetUserId:       String(targetUser?._id || entrySnapshot.userId || ""),
      targetUserName:     targetUser?.name || "Unknown",
      targetTechnicianId: targetUser?.technicianId || "",
      targetBranch:       entrySnapshot.branch || "",
      ipAddress:          req.ip || "",
    });
  } catch (err) {
    // Intentional: never throw. Log and move on.
    console.error("[AuditLog] Failed to write audit log:", err.message);
  }
}

module.exports = { writeAuditLog };