// instrument.js
//
// Sentry's own docs are explicit about this: this file must be required
// before any other module in the app, including dotenv in server.js. It is
// otherwise unable to auto-instrument things like Express and Mongoose.
//
// If SENTRY_DSN isn't set in the environment (e.g. running locally without
// one configured), Sentry.init() simply no-ops — nothing else breaks, you
// just won't get error reports until the env var is added on Render.

require("dotenv").config();
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
  // 10% of requests get full performance traces — enough to spot slow
  // endpoints without burning through the free Sentry plan's event quota.
  tracesSampleRate: 0.1,
});

module.exports = Sentry;