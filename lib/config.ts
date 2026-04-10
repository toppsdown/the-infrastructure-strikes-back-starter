// Centralized config reads. Blue teams should NOT modify this file.
//
// Fail-closed: required secrets must be provided via environment variables.
// No defaults, no ephemeral fallbacks.

export function getAdminToken(): string {
  const fromEnv = process.env.ADMIN_TOKEN?.trim();
  if (!fromEnv || fromEnv.length < 16) {
    throw new Error("ADMIN_TOKEN required (>=16 chars)");
  }
  return fromEnv;
}

export function getSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (!fromEnv || fromEnv.length < 32) {
    throw new Error("SESSION_SECRET required (>=32 chars)");
  }
  return fromEnv;
}
