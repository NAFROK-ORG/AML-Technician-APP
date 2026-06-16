/**
 * server/utils/constants.js
 *
 * Single source of truth for all validated enums on the backend.
 * Frontend mirror: client/src/utils/constants.js
 *
 * When adding a branch: update BOTH this file AND client/src/utils/constants.js.
 * Never hardcode branch names anywhere else.
 */

const VALID_BRANCHES = [
  "BALLARI",
  "CHITRADURGA",
  "HOSPET",
  "RAICHUR",
  "TORANAGALLU", // was missing from adminController — caused silent 400 on branch change
];

module.exports = { VALID_BRANCHES };