// middleware/rateLimit.js
// WHAT THIS FILE IS: a speed limit for sensitive routes (sign-in, sign-up, password reset).
// WHAT IT DOES: counts requests per visitor address in a time window and answers 429 "too many
// attempts" when the limit is passed. This slows down password guessing. It is kept in memory,
// so with several servers behind a load balancer the teammate should replace it with a shared
// store (for example the API gateway's throttling or a DynamoDB counter).

import { AppError } from "../utils/errors.js";

export function createRateLimiter({ windowMs, max, enabled = true }) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    if (!enabled) return next();
    const now = Date.now();
    const key = req.ip || "unknown";
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
        return next(new AppError(429, "TOO_MANY_REQUESTS", "Too many attempts. Please wait a few minutes and try again."));
      }
    }
    // Tidy old entries now and then so memory does not grow forever.
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    next();
  };
}
