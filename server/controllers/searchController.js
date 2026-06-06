const Entry = require("../models/Entry");

const LIMIT     = 10;
const MIN_CHARS = 3;
const MAX_CHARS = 20; // matches frontend maxLength={20}

/**
 * buildVehicleRegex — flexible regex for Indian vehicle numbers.
 *
 * Indian number plates: KA-01-AB-1234 / MH12AB1234 / DL 01 AB 1234
 * Technicians may have typed with or without hyphens/spaces.
 * This regex handles all variants so the search works regardless
 * of how the entry was originally typed.
 *
 * Strategy:
 *   1. Strip all hyphens and spaces from the query.
 *   2. Regex-escape each character (safety against special chars).
 *   3. Re-join with optional [-\s]? between every character.
 *
 * Examples:
 *   "1234"       → /1[-\s]?2[-\s]?3[-\s]?4/i   ← last-4-digit search
 *   "KA01AB1234" → /K[-\s]?A[-\s]?0[-\s]?...4/i ← matches "KA-01-AB-1234"
 *   "KA-01"      → /K[-\s]?A[-\s]?0[-\s]?1/i    ← stripped then flexible
 *
 * Index note:
 *   These patterns have no ^ anchor, so MongoDB cannot use the vehicleNo
 *   B-tree index for the regex filter — it always does a collection scan.
 *   At current scale (~12,500 entries/year) this is sub-millisecond.
 *   The index on vehicleNo benefits future exact-match queries.
 */
function buildVehicleRegex(rawQuery) {
  const stripped = rawQuery.replace(/[-\s]/g, "").toUpperCase();
  // Regex-escape each character individually before joining
  const escaped = stripped
    .split("")
    .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = escaped.join("[-\\s]?");
  return new RegExp(pattern, "i");
}

/**
 * GET /api/search/vehicle?q=<query>&page=<n>
 *
 * Auth     : protect + superAdminOnly (enforced in searchRoutes.js)
 *            No branchGuard — superadmin is cross-branch by design.
 *            branchGuard would block superadmins (branch: "all").
 * Scope    : ALL branches — superadmin only feature
 * Sort     : date desc → createdAt desc (newest service first)
 * Paginate : 10 per page
 * Populate : userId → name, technicianId, technicianType only
 *            branch is NOT populated from userId — Entry.branch is used
 *            directly (it is copied from User.branch at creation and is
 *            always present on the Entry document itself).
 *
 * vehicleNo is optional on Entry — entries without it default to "".
 * The regex never matches "" so those entries are naturally excluded.
 */
exports.vehicleSearch = async (req, res) => {
  try {
    const { q = "", page = "1" } = req.query;

    const query = q.trim();

    // ── Input validation ──────────────────────────────────────────
    if (query.length < MIN_CHARS) {
      return res.status(400).json({
        message: `Enter at least ${MIN_CHARS} characters to search`,
      });
    }
    // Guard against oversized queries bypassing frontend maxLength.
    // buildVehicleRegex joins every char with [-\\s]? — an unbounded
    // query produces an unbounded regex pattern. Hard cap at 20 chars.
    if (query.length > MAX_CHARS) {
      return res.status(400).json({
        message: `Query too long — maximum ${MAX_CHARS} characters`,
      });
    }

    // ── Pagination ────────────────────────────────────────────────
    // Math.max guards against page=0, page=-1, or NaN from direct API calls.
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip     = (safePage - 1) * LIMIT;

    // ── Query ─────────────────────────────────────────────────────
    const regex  = buildVehicleRegex(query);
    const filter = { vehicleNo: { $regex: regex } };

    // Count and fetch in parallel — eliminates sequential round-trips.
    // Both operations share the same filter object.
    const [entries, total] = await Promise.all([
      Entry.find(filter)
        // FIX: branch removed from populate — Entry.branch is used on the
        // card (entry.branch), not tech.branch. Fetching it from userId
        // was redundant and added unnecessary payload to every result.
        .populate("userId", "name technicianId technicianType")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(LIMIT)
        .lean(),
      Entry.countDocuments(filter),
    ]);

    return res.status(200).json({
      results:    entries,
      total,
      page:       safePage,
      totalPages: Math.ceil(total / LIMIT),
      query,
    });

  } catch (err) {
    console.error("[vehicleSearch] Error:", err.message);
    return res.status(500).json({ message: "Search failed. Please try again." });
  }
};