/**
 * Phase 2 scaffold — deception responses for classified-adversarial
 * traffic only.
 *
 * NOT wired into the request path. Do not import from any handler
 * until Phase 2 activation at 7:00 PM PDT.
 *
 * EVENT RULE: deception MUST NEVER be returned to unclassified or
 * legitimate traffic. Every call into this module requires a Verdict
 * meeting `DECEPTION_SCORE_FLOOR`. A helper guard enforces this so
 * callers cannot accidentally leak fake data to real users.
 *
 * Intended wiring (Phase 2):
 *   import { classify } from "@/shared/phase2/fingerprint";
 *   import { maybeDeceive } from "@/shared/phase2/deception";
 *   const v = classify(req);
 *   const fake = maybeDeceive(v, "action-id");
 *   if (fake) return new Response(JSON.stringify(fake), { status: 200 });
 */

import { randomBytes } from "node:crypto";
import type { Verdict } from "./fingerprint";

export const DECEPTION_SCORE_FLOOR = 0.7;

export type DeceptionKind = "session-token" | "reset-token" | "action-id" | "admin-token";

export interface DeceptionPayload {
  kind: DeceptionKind;
  value: string;
  issued_at: string;
}

function isAdversarial(v: Verdict): boolean {
  return v.score >= DECEPTION_SCORE_FLOOR;
}

export function fakeSessionToken(): string {
  // Shape mimics base64url.base64url used by real sessions.
  const body = randomBytes(48).toString("base64url");
  const sig = randomBytes(32).toString("base64url");
  return `${body}.${sig}`;
}

export function fakeResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function fakeActionId(): string {
  return "act_" + randomBytes(10).toString("hex");
}

export function fakeAdminToken(): string {
  return "adm_" + randomBytes(24).toString("base64url");
}

/**
 * Returns a deception payload iff the verdict is adversarial. Returns
 * `null` for legitimate / unclassified traffic — callers must treat
 * null as "do not substitute; fall through to the real handler".
 */
export function maybeDeceive(v: Verdict, kind: DeceptionKind): DeceptionPayload | null {
  if (!isAdversarial(v)) return null;
  let value: string;
  switch (kind) {
    case "session-token": value = fakeSessionToken(); break;
    case "reset-token": value = fakeResetToken(); break;
    case "action-id": value = fakeActionId(); break;
    case "admin-token": value = fakeAdminToken(); break;
  }
  return { kind, value, issued_at: new Date().toISOString() };
}

/**
 * Wraps a JSON body with deceptive substitutions for specific keys,
 * only if the verdict is adversarial.
 */
export function deceiveJson(
  v: Verdict,
  body: Record<string, unknown>,
  substitutions: Partial<Record<string, DeceptionKind>>,
): Record<string, unknown> {
  if (!isAdversarial(v)) return body;
  const out: Record<string, unknown> = { ...body };
  for (const [key, kind] of Object.entries(substitutions)) {
    if (!kind) continue;
    const d = maybeDeceive(v, kind);
    if (d) out[key] = d.value;
  }
  return out;
}
