const { rateLimit } = require("express-rate-limit");

// ─── General limiter ───────────────────────────────────────────────────────
// Applied to every route. Sized to never trigger on normal usage — even the
// documented morning burst (300-500+ requests across ALL users/branches in a
// 15-20 min window) is nowhere close to 400 requests from a SINGLE IP in 5
// minutes. This exists to stop abuse (a buggy frontend retry loop, a
// scripted scraper, a compromised token being hammered) — not to relieve
// legitimate concurrent load. That's what the caching layer is for.
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please wait a moment and try again." },
});

// ─── Login limiter ─────────────────────────────────────────────────────────
// Much stricter, and scoped only to /api/auth/login (wired in server.js).
// skipSuccessfulRequests means a correct login never counts against the
// limit — only repeated *failed* attempts get throttled, which is exactly
// the brute-force-guessing scenario this exists to block.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

module.exports = { generalLimiter, authLimiter };