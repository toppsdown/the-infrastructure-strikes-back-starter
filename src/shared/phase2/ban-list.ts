/**
 * Phase 2 scaffold — in-memory IP ban list with TTL.
 *
 * NOT wired into the request path. Do not import from any handler
 * until Phase 2 activation at 7:00 PM PDT.
 *
 * Intended wiring (Phase 2):
 *   import { isBanned, banListHandler } from "@/shared/phase2/ban-list";
 *   if (isBannedReq(req)) return banListHandler();
 */

import { extractIp } from "./fingerprint";

export interface BanEntry {
  ip: string;
  reason: string;
  expiresAt: number; // epoch ms; Infinity for permanent
  createdAt: number;
}

const bans: Map<string, BanEntry> = new Map();

export function addBan(ip: string, reason: string, ttlMs: number): void {
  const now = Date.now();
  bans.set(ip, {
    ip,
    reason,
    createdAt: now,
    expiresAt: ttlMs <= 0 ? Number.POSITIVE_INFINITY : now + ttlMs,
  });
}

export function isBanned(ip: string): boolean {
  const entry = bans.get(ip);
  if (!entry) return false;
  if (Date.now() >= entry.expiresAt) {
    bans.delete(ip);
    return false;
  }
  return true;
}

export function isBannedReq(req: Request): boolean {
  return isBanned(extractIp(req));
}

export function removeBan(ip: string): boolean {
  return bans.delete(ip);
}

export function listBans(): BanEntry[] {
  const now = Date.now();
  const out: BanEntry[] = [];
  for (const [ip, entry] of bans) {
    if (now >= entry.expiresAt) {
      bans.delete(ip);
      continue;
    }
    out.push(entry);
  }
  return out;
}

export function clearBans(): void {
  bans.clear();
}

/**
 * Returns a generic 403 Response. Do not leak ban reason to clients —
 * the reason field is for operator logs only.
 */
export function banListHandler(): Response {
  return new Response(JSON.stringify({ error: "forbidden" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}
