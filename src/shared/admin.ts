import { timingSafeEqual } from "node:crypto";
import { getAdminToken } from "@/lib/config";
import { getClientIp } from "@/src/shared/clientIp";

// Minimal admin/judge gate. Accepts the token via the x-admin-token header only.
// Query-string tokens are rejected (they leak via proxy logs, history, Referer).

// Inline rate limiter: 10 requests/minute/IP, shared across admin routes.
const ADMIN_RL_MAX = 10;
const ADMIN_RL_WINDOW_MS = 60_000;
const adminHits: Map<string, number[]> = new Map();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - ADMIN_RL_WINDOW_MS;
  const arr = (adminHits.get(ip) || []).filter((t) => t > cutoff);
  arr.push(now);
  adminHits.set(ip, arr);
  return arr.length > ADMIN_RL_MAX;
}

export type AdminCheck =
  | { ok: true }
  | { ok: false; status: number; reason: string };

export function checkAdmin(req: Request): AdminCheck {
  const ip = getClientIp(req);
  if (rateLimited(ip)) {
    return { ok: false, status: 429, reason: "admin rate limit" };
  }

  const expectedToken = getAdminToken();
  const presentedToken = req.headers.get("x-admin-token") || "";
  if (!presentedToken) {
    return { ok: false, status: 401, reason: "missing admin token" };
  }

  const expected = Buffer.from(expectedToken, "utf8");
  const presented = Buffer.from(presentedToken, "utf8");
  const padded = Buffer.alloc(expected.length);
  presented.copy(padded, 0, 0, Math.min(presented.length, expected.length));
  const equal =
    timingSafeEqual(expected, padded) && presented.length === expected.length;
  if (!equal) {
    return { ok: false, status: 401, reason: "bad admin token" };
  }
  return { ok: true };
}
