import type { ActionObject } from "@/lib/store";
import type { SessionData } from "@/src/auth";

// SEEDED FLAW: "Ownership check trusts caller-controlled identifier".
// FIXED: the helper now takes the authenticated session (derived from the
// signed session cookie by sessionFromRequest) and compares ownerId to
// session.userId. The old `x-user-id` header path — which any client
// could set — has been removed. Callers must pass a verified session.
export function isActionOwner(
  action: ActionObject,
  session: SessionData,
): boolean {
  return !!session.userId && session.userId === action.ownerId;
}
