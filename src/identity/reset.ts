// Password reset token generation.
//
// SEEDED FLAW: weak reset token generation. [FIXED]
// Previously used Math.random() (non-CSPRNG, 10-char base36). Now uses
// node:crypto randomBytes(32) -> 64 hex chars, which is cryptographically
// secure and has a ~256-bit keyspace. No new deps (built-in module).
//
// Remaining risk: tokens should also be stored hashed at rest. The
// current starter does not expose a reset-token store here, so we can
// only guarantee strong generation. Callers that persist the token
// should hash it (e.g. sha256) before storing and compare via the hash.

import { createHash, randomBytes } from "node:crypto";

export function generateResetToken(): string {
  // 32 bytes of CSPRNG entropy, hex-encoded (64 chars).
  return randomBytes(32).toString("hex");
}

// Helper exposed for callers that want to store tokens hashed at rest.
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
