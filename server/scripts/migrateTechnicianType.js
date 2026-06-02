/**
 * migrateTechnicianType.js
 *
 * Run ONCE before deploying the technicianType feature.
 * Usage: node server/scripts/migrateTechnicianType.js
 *
 * What it does:
 *   1. Sets technicianType: null on every technician user that doesn't have the field yet.
 *   2. Sets technicianType: null on every entry that doesn't have the field yet.
 *      (Entries get a real value backfilled when each technician selects their type.)
 *
 * Idempotent — safe to run multiple times. Uses $exists: false so already-migrated
 * documents are never touched.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌  MONGO_URI not found — check server/.env");
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB Atlas…");
  await mongoose.connect(uri);
  console.log("✅  Connected.\n");

  const users   = mongoose.connection.db.collection("users");
  const entries = mongoose.connection.db.collection("entries");

  // ── Step 1: Users ──────────────────────────────────────────────────────────
  const userResult = await users.updateMany(
    { role: "technician", technicianType: { $exists: false } },
    { $set: { technicianType: null } }
  );
  console.log("👤  Users:");
  console.log(`    matched:  ${userResult.matchedCount}`);
  console.log(`    modified: ${userResult.modifiedCount}`);

  // ── Step 2: Entries ────────────────────────────────────────────────────────
  // Null out the field on all entries so the schema is clean everywhere.
  // Real values get backfilled per-user when they select their type.
  const entryResult = await entries.updateMany(
    { technicianType: { $exists: false } },
    { $set: { technicianType: null } }
  );
  console.log("\n📋  Entries:");
  console.log(`    matched:  ${entryResult.matchedCount}`);
  console.log(`    modified: ${entryResult.modifiedCount}`);

  console.log("\n✅  Migration complete.");
  console.log("📌  Entry backfill happens automatically when each technician");
  console.log("    selects their type via the new modal.\n");
  console.log("🚀  Next: deploy backend → deploy frontend\n");

  await mongoose.disconnect();
  console.log("🔌  Disconnected.");
}

migrate().catch((err) => {
  console.error("❌  Migration error:", err.message);
  process.exit(1);
});