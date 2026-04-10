/**
 * Phase 2 scaffold — in-memory sliding-window rate limiter.
 *
 * NOT wired into the request path. Do not import from any handler
 * until Phase 2 activation at 7:00 PM PDT.
 *
 * Intended wiring (Phase 2):
 *   import { createRateLimiter } from "@/shared/phase2/rate-limiter";
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 120,
 *     keyFn: (req) => req.headers.get("x-forwarded-for") ?? "anon" });
 *   const { allowed, retryAfter } = limiter.limit(req);
 *   if (!allowed) return new Response("rate limited",
 *     { status: 429, headers: { "retry-after": String(retryAfter) } });
 */

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
}

export interface RateLimiter {
  limit: (req: Request) => RateLimitResult;
  reset: (key?: string) => void;
  size: () => number;
}

interface Bucket {
  timestamps: number[];
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const { windowMs, max, keyFn } = opts;
  const buckets: Map<string, Bucket> = new Map();

  const prune = (bucket: Bucket, now: number): void => {
    const cutoff = now - windowMs;
    let i = 0;
    while (i < bucket.timestamps.length && bucket.timestamps[i] < cutoff) i++;
    if (i > 0) bucket.timestamps.splice(0, i);
  };

  return {
    limit(req: Request): RateLimitResult {
      const key = keyFn(req);
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { timestamps: [] };
        buckets.set(key, bucket);
      }
      prune(bucket, now);
      if (bucket.timestamps.length >= max) {
        const oldest = bucket.timestamps[0];
        const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
        return { allowed: false, retryAfter, remaining: 0 };
      }
      bucket.timestamps.push(now);
      return { allowed: true, remaining: max - bucket.timestamps.length };
    },
    reset(key?: string): void {
      if (key === undefined) buckets.clear();
      else buckets.delete(key);
    },
    size(): number {
      return buckets.size;
    },
  };
}
