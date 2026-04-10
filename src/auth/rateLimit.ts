// SEEDED FLAW (fixed): no login rate limit.
//
// Simple in-memory fixed-window rate limiter for the login route.
// Keyed by `${ip}|${username}` so that an attacker cannot trivially
// lock out other users from arbitrary IPs, but credential-stuffing
// from a single source is still capped. No new dependencies: just a
// module-level Map with timestamp-based expiry.

import { getClientIp } from "@/src/shared/clientIp";

const WINDOW_MS = 60_000; // 1 minute window
const MAX_ATTEMPTS = 10; // per window per (ip, username)

type Bucket = { count: number; firstAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  return getClientIp(req);
}

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

// Call before attempting to verify credentials. Returns { allowed: false }
// when the (ip, username) bucket has exceeded MAX_ATTEMPTS in WINDOW_MS.
export function checkLoginRateLimit(req: Request, username: string): RateLimitResult {
  const key = `${clientIp(req)}|${username.toLowerCase()}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.firstAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAt: now });
    return { allowed: true, retryAfterMs: 0 };
  }
  b.count += 1;
  if (b.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - b.firstAt) };
  }
  return { allowed: true, retryAfterMs: 0 };
}
