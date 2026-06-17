// utils/cache.js
//
// Lightweight in-memory cache for expensive, frequently-hit read endpoints
// (dashboard aggregations, the polled security board). Purely additive —
// nothing here touches writes, auth, or stored data, and nothing is ever
// cached unless a controller explicitly opts in via getOrSet().
//
// Lives in process memory only: it resets on every deploy/restart, and is
// per-instance. That's fine here since Render runs a single instance — if
// that ever changes (multiple instances), this would need to move to a
// shared store (e.g. Redis) to stay correct across instances.

const NodeCache = require("node-cache");

// stdTTL is just a fallback — every call below passes its own ttlSeconds.
const store = new NodeCache({ stdTTL: 30, checkperiod: 60 });

/**
 * getOrSet — returns the cached value for `key` if present and not expired;
 * otherwise runs `fetchFn`, caches the result for `ttlSeconds`, and returns
 * it.
 *
 * If fetchFn throws (e.g. a transient Mongo error), nothing is cached — the
 * next call retries against the DB fresh, so a failure never gets "stuck"
 * cached.
 */
const getOrSet = async (key, ttlSeconds, fetchFn) => {
  const cached = store.get(key);
  if (cached !== undefined) return cached;

  const fresh = await fetchFn();
  store.set(key, fresh, ttlSeconds);
  return fresh;
};

/** Manually clear one key or the whole cache — handy for debugging. */
const invalidate = (key) => {
  if (key) store.del(key);
  else store.flushAll();
};

module.exports = { getOrSet, invalidate };