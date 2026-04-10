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

// ── Phase 2: pre-seeded red team account bans ──────────────────────
const SEED_BANS: string[] = [
  "alice2_1775789966",
  "bob2_1775789966",
  "probe2_1775789983",
  "hacker_1775790216",
  "victim_1775790216",
  "rtA_u56muo",
  "rtB_dwkvdm",
  "u_e0c0ed",
  "t3_1775789931_28136",
  "redteam3",
  "redteam1",
  "redteam2",
  "a_5aa91f",
  "b_5aa91f",
  "attacker_1775789994",
  "victim_1775790009",
  "probe_1775789965",
  "probe_b3labs_refoldla",
  "injtest_t3",
  "redteam_t3_fresh",
  "tw17757902807181",
  "sigprobe_1775790195_30333",
  "fresh1",
  "redteam_test1",
  "delta_26680_20260409-195945",
  "ghost_not_real_abc",
  "hdr_1775789963_3955",
  "r_20260409-200348_5487",
  "s_1775790255_2480",
  "alice_1775789902",
  "bob_1775789902",
  "nonexistent_zz_123",
  "idor_user",
  "pt_1775789672_r4a",
  "pt_1775789697_rl",
  "pt_1775789678_nr1",
];
for (const id of SEED_BANS) {
  addBan(id, "pre-seeded red team account", -1); // permanent
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
