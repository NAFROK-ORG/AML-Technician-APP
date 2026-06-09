/**
 * vehicleUtils.js — client-side mirror of server/utils/vehicleUtils.js
 *
 * Must stay in sync with the server version.
 * Used in:
 *   - EntryForm.jsx          → normalization preview on new entry
 *   - TechnicianDashboard.jsx → normalization preview on edit entry
 *   - SecurityDashboard.jsx  → normalization preview on log + edit
 *   - VehicleLogBoard.jsx    → normalize search query before sending
 */

/**
 * normalizeVehicleNo(raw)
 *
 * Strips all hyphens and spaces, uppercases the result.
 * "KA-01-AB-1234" → "KA01AB1234"
 * "ka 01 ab 1234" → "KA01AB1234"
 * "KA01AB1234"    → "KA01AB1234"
 * null / ""       → ""
 */
export function normalizeVehicleNo(raw) {
  if (!raw) return "";
  return raw.replace(/[-\s]/g, "").toUpperCase().trim();
}