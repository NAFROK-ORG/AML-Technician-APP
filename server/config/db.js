const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // The MongoDB driver defaults maxPoolSize to 100, which is well within
      // Atlas M0's 500-connection limit — pool size was never actually the
      // bottleneck. Capping it lower than the default is intentional: on a
      // shared, CPU-constrained M0 cluster, a smaller pool acts as built-in
      // admission control. Once 20 operations are in flight, further
      // requests wait for a free connection instead of piling even more
      // concurrent load onto a cluster that's already struggling — which is
      // exactly the failure mode described in the morning-burst risk.
      maxPoolSize: 20,
      minPoolSize: 2,

      // Default is 30 seconds — far too long to leave a user staring at a
      // spinner during a burst. 10s means a stuck request fails fast with a
      // clear error instead of hanging.
      serverSelectionTimeoutMS: 10000,

      // How long an idle socket can go before being killed. Kept above
      // serverSelectionTimeoutMS per Mongoose's own recommendation.
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Visibility into connection health AFTER the initial connect succeeds.
// None of this existed before — a mid-day disconnect (Render restart,
// network blip, Atlas maintenance) was previously silent until requests
// started failing for no apparent reason. If SENTRY_DSN is configured,
// the console.error below is also automatically captured by Sentry.
mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected — driver will attempt to reconnect automatically.");
});

mongoose.connection.on("reconnected", () => {
  console.log("[MongoDB] Reconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error("[MongoDB] Connection error:", err.message);
});

module.exports = connectDB;