/**
 * Phase 2 scaffold — honeypot fake data generators.
 *
 * NOT wired into the request path. Do not import from any handler
 * until Phase 2 activation at 7:00 PM PDT.
 *
 * Intended wiring (Phase 2):
 *   import { serveHoneypot } from "@/shared/phase2/honeypot";
 *   if (classified.score > 0.9 && req.url.includes("/admin")) {
 *     return serveHoneypot("admins");
 *   }
 *
 * The three targets correspond to the most obvious attacker goals in
 * this app: enumerating admin users, forging action objects, and
 * replaying reset tokens.
 */

import { randomBytes, createHash } from "node:crypto";

export type HoneypotKind = "admins" | "actions" | "reset-tokens";

export interface FakeAdmin {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string;
}

export interface FakeAction {
  id: string;
  owner_id: string;
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FakeResetToken {
  token: string;
  user_id: string;
  username: string;
  expires_at: string;
  issued_at: string;
}

function seededHex(seed: string, bytes: number): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, bytes * 2);
}

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

const FAKE_USERNAMES = [
  "m.alvarez", "j.okafor", "priya.shah", "tkwon", "r.delacruz",
  "s.goldberg", "nlindqvist", "c.yamamoto", "d.eriksson", "h.petrov",
];

export function fakeAdmins(n = 6): FakeAdmin[] {
  const out: FakeAdmin[] = [];
  for (let i = 0; i < n; i++) {
    const username = FAKE_USERNAMES[i % FAKE_USERNAMES.length];
    const id = "usr_" + seededHex(`admin:${i}:${username}`, 8);
    out.push({
      id,
      username,
      email: `${username}@corp.internal`,
      role: i === 0 ? "superadmin" : "admin",
      created_at: isoAgo(1000 * 60 * 60 * 24 * (30 + i * 11)),
      last_login: isoAgo(1000 * 60 * (5 + i * 17)),
    });
  }
  return out;
}

export function fakeActions(n = 8): FakeAction[] {
  const kinds = ["transfer", "approve", "revoke", "mint", "rotate"];
  const out: FakeAction[] = [];
  for (let i = 0; i < n; i++) {
    const id = "act_" + seededHex(`action:${i}`, 10);
    const owner = "usr_" + seededHex(`owner:${i % 5}`, 8);
    out.push({
      id,
      owner_id: owner,
      kind: kinds[i % kinds.length],
      payload: {
        amount: 100 + i * 37,
        currency: "USD",
        memo: `ref-${seededHex(`memo:${i}`, 4)}`,
      },
      created_at: isoAgo(1000 * 60 * (3 + i * 7)),
      updated_at: isoAgo(1000 * 60 * (1 + i * 2)),
    });
  }
  return out;
}

export function fakeResetTokens(n = 4): FakeResetToken[] {
  const out: FakeResetToken[] = [];
  for (let i = 0; i < n; i++) {
    // Plausible-looking token: 32 bytes hex, looks like real output.
    const token = randomBytes(32).toString("hex");
    const username = FAKE_USERNAMES[(i + 3) % FAKE_USERNAMES.length];
    out.push({
      token,
      user_id: "usr_" + seededHex(`rtuser:${i}`, 8),
      username,
      issued_at: isoAgo(1000 * 60 * (2 + i * 4)),
      expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    });
  }
  return out;
}

export function serveHoneypot(kind: HoneypotKind): Response {
  let body: unknown;
  switch (kind) {
    case "admins":
      body = { users: fakeAdmins() };
      break;
    case "actions":
      body = { actions: fakeActions() };
      break;
    case "reset-tokens":
      body = { tokens: fakeResetTokens() };
      break;
    default:
      body = {};
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
