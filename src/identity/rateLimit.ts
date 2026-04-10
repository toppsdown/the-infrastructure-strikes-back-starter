// Simple in-memory rate limiter for identity routes.
//
// Supports the signup abuse-protection fix for the "Unrestricted signup"
// SEEDED FLAW. Keyed by arbitrary string (typically client IP). Uses a
// fixed-window counter with automatic expiry sweeping. No new deps.
//
// Intentionally generous defaults so the happy-path probe (which signs
// up fresh users) is not impacted: 30 requests / minute / IP by default.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    // Opportunistic sweep to keep the map bounded.
    if (buckets.size > 1024) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

import { getClientIp } from "@/src/shared/clientIp";

// Trusted client IP extraction. Delegates to the shared Vercel-aware
// helper which ignores attacker-controllable x-forwarded-for.
export function clientIpFromRequest(req: Request): string {
  return getClientIp(req);
}

// Signup-specific convenience wrapper. Generous limit (30/min/IP) per
// the event rules hard-gate: happy-path signup must keep working.
export function checkSignupRateLimit(req: Request): RateLimitResult {
  return checkRateLimit(
    `signup:${clientIpFromRequest(req)}`,
    30,
    60 * 1000,
  );
}
