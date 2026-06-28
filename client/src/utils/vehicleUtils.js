/**
 * vehicleUtils.js — client-side mirror of server/utils/vehicleUtils.js
 *
 * Must stay in sync with the server version.
 * Used in:
 *   - EntryForm.jsx             → normalization preview on new entry
 *   - TechnicianDashboard.jsx   → normalization preview on edit entry
 *   - SecurityDashboard.jsx     → normalization preview + format validation on log/edit
 *   - VehicleLogBoard.jsx       → normalize search query before sending
 */

// ─── State / UT codes ─────────────────────────────────────────────────────────

/**
 * Complete set of valid Indian state and Union Territory vehicle-registration
 * prefix codes. Includes all current codes AND legacy codes still found on
 * older vehicles registered before state renames or reorganizations.
 *
 * Source: MoRTH (Ministry of Road Transport & Highways) / VAHAN portal.
 * Last reviewed: Jun 2025.
 *
 * Exported so dashboards can reference it for live segment colouring.
 * Used for soft warnings only — an unrecognized code NEVER blocks submission,
 * since misread plates, new codes, and edge cases always exist in the field.
 */
export const VALID_STATE_CODES = new Set([
  // ── 28 States ──────────────────────────────────────────────────────────────
  "AP", // Andhra Pradesh
  "AR", // Arunachal Pradesh
  "AS", // Assam
  "BR", // Bihar
  "CG", // Chhattisgarh                    (formed Nov 2000 from MP)
  "GA", // Goa
  "GJ", // Gujarat
  "HR", // Haryana
  "HP", // Himachal Pradesh
  "JH", // Jharkhand                       (formed Nov 2000 from BR)
  "KA", // Karnataka
  "KL", // Kerala
  "MP", // Madhya Pradesh
  "MH", // Maharashtra
  "MN", // Manipur
  "ML", // Meghalaya
  "MZ", // Mizoram
  "NL", // Nagaland
  "OD", // Odisha                          (renamed from Orissa, 2011)
  "PB", // Punjab
  "RJ", // Rajasthan
  "SK", // Sikkim
  "TN", // Tamil Nadu
  "TR", // Tripura
  "TS", // Telangana                       (formed Jun 2014 from AP)
  "UK", // Uttarakhand                     (formed Nov 2000 from UP)
  "UP", // Uttar Pradesh
  "WB", // West Bengal

  // ── 8 Union Territories ────────────────────────────────────────────────────
  "AN", // Andaman & Nicobar Islands
  "CH", // Chandigarh
  "DD", // Daman & Diu          (merged into unified UT, Jan 2020; plates still active)
  "DL", // Delhi (NCT)
  "DN", // Dadra & Nagar Haveli (merged into unified UT, Jan 2020; plates still active)
  "JK", // Jammu & Kashmir                 (UT since Oct 2019)
  "LA", // Ladakh                          (new UT since Nov 2019)
  "LD", // Lakshadweep
  "PY", // Puducherry

  // ── Legacy / historical ────────────────────────────────────────────────────
  // Pre-reorganization codes on vehicles still registered and roadworthy.
  "OR", // Odisha — registered when state was spelled "Orissa" (pre-2011 plates)
]);

// ─── Normalisation ───────────────────────────────────────────────────────────

/**
 * normalizeVehicleNo(raw)
 *
 * Strips hyphens and spaces, uppercases the result.
 *   "KA-01-AB-1234" → "KA01AB1234"
 *   "ka 01 ab 1234" → "KA01AB1234"
 *   "KA01AB1234"    → "KA01AB1234"
 *   null / ""       → ""
 */
export function normalizeVehicleNo(raw) {
  if (!raw) return "";
  return raw.replace(/[-\s]/g, "").toUpperCase().trim();
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * parsePlate(raw)
 *
 * Parses a raw vehicle number (mid-typing OR complete) into its constituent
 * segments without requiring a full match. Safe to call on every keystroke.
 *
 * Handles two formats:
 *   Standard  → { isBH: false, state, dist, series, num }
 *   BH series → { isBH: true,  year, num, cat }
 *
 * BH detection: input starts with 2 digits followed by literal "BH".
 * Examples: 21BH0001AA, 23BH4521CD
 */
export function parsePlate(raw) {
  const v = normalizeVehicleNo(raw);

  // ── BH series ──
  if (/^\d{2}BH/.test(v)) {
    return {
      isBH: true,
      year: v.slice(0, 2),
      num:  v.slice(4, 8),
      cat:  v.slice(8, 10),
    };
  }

  // ── Standard format — character-by-character (supports mid-type state) ──
  let pos = 0, state = "", dist = "", series = "", num = "";
  while (pos < v.length && /[A-Z]/.test(v[pos]) && state.length < 2)  state  += v[pos++];
  while (pos < v.length && /\d/.test(v[pos])    && dist.length < 2)   dist   += v[pos++];
  while (pos < v.length && /[A-Z]/.test(v[pos]) && series.length < 3) series += v[pos++];
  while (pos < v.length && /\d/.test(v[pos])    && num.length < 4)    num    += v[pos++];

  return { isBH: false, state, dist, series, num };
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * getPlateStatus(parts)
 *
 * Given parsed parts from parsePlate(), returns a status object:
 *
 *   { valid: true }
 *     Plate is complete and well-formed.
 *
 *   { valid: true, warn: true, msg: string }
 *     Complete but something looks suspicious.
 *     Soft warning — does NOT block submission.
 *
 *   { valid: false, msg: null }
 *     Nothing typed yet. Show no error UI.
 *
 *   { valid: false, msg: string, field?: string }
 *     Specific format error.
 *     field names the incomplete segment for UI highlighting.
 *
 * Unrecognized state codes are ALWAYS a soft warning, never a hard block.
 */
export function getPlateStatus(parts) {
  if (!parts) return { valid: false, msg: null };

  // ── BH series ──────────────────────────────────────────────────────────────
  if (parts.isBH) {
    const { year, num, cat } = parts;

    if (year.length < 2)
      return { valid: false, field: "year", msg: "Year prefix incomplete (e.g. 21 for 2021)" };

    if (num.length < 4) {
      const n = 4 - num.length;
      return { valid: false, field: "num", msg: `${n} more digit${n > 1 ? "s" : ""} needed — number must be 4 digits` };
    }

    if (cat.length < 2) {
      const n = 2 - cat.length;
      return { valid: false, field: "cat", msg: `${n} more letter${n > 1 ? "s" : ""} needed for BH category code` };
    }

    return { valid: true, isBH: true, msg: "Valid BH-series plate — ready to log" };
  }

  // ── Standard format ────────────────────────────────────────────────────────
  const { state, dist, series, num } = parts;

  if (!state)
    return { valid: false, msg: null };

  if (state.length < 2) {
    const n = 2 - state.length;
    return { valid: false, field: "state", msg: `${n} more letter${n > 1 ? "s" : ""} needed for state code` };
  }

  if (dist.length < 2) {
    const n = 2 - dist.length;
    return { valid: false, field: "dist", msg: `${n} more digit${n > 1 ? "s" : ""} needed for district` };
  }

  if (!series)
    return { valid: false, field: "series", msg: "Series letters missing — e.g. AA, BB, CD" };

  if (num.length < 4) {
    const n = 4 - num.length;
    return { valid: false, field: "num", msg: `${n} more digit${n > 1 ? "s" : ""} needed — number must be 4 digits` };
  }

  // All segments complete — soft-warn on unrecognized state codes only
  if (!VALID_STATE_CODES.has(state)) {
    return {
      valid: true,
      warn: true,
      msg: `"${state}" is not a recognized state code — double-check the plate`,
    };
  }

  return { valid: true, msg: "Valid plate — ready to log" };
}