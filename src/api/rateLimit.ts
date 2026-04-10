// Simple in-memory sliding-window rate limiter keyed by a subject
// string (typically the authenticated session userId). No external
// deps. Used to address the "no action creation rate limit" seeded
// flaw — a single user cannot spam action creation.
//
// Limits are intentionally generous for normal use and cheap to check.

type Bucket = { count: number; resetAt: number };

declare global {

  var __ISB_RL__: Map<string, Bucket> | undefined;
}

function store(): Map<string, Bucket> {
  if (!globalThis.__ISB_RL__) globalThis.__ISB_RL__ = new Map();
  return globalThis.__ISB_RL__;
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Fixed-window rate limit. Returns ok=false once `limit` hits are
 * recorded in the current window. Expired buckets are lazily reset.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const map = store();
  const existing = map.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    map.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}
