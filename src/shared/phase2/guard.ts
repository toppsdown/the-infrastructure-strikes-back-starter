/**
 * Phase 2 guard — early rejection for banned IPs and usernames.
 *
 * Call at the top of every non-admin route handler:
 *   const blocked = phase2Guard(req);
 *   if (blocked) return blocked;
 */

import { getClientIp } from "@/src/shared/clientIp";
import { isBanned, banListHandler } from "./ban-list";
import { sessionFromRequest } from "@/src/auth";

/**
 * Returns a 403 Response if the request's IP or session identity is
 * banned, or null if the request should proceed normally.
 */
export function phase2Guard(req: Request): Response | null {
  // Check IP ban
  const ip = getClientIp(req);
  if (isBanned(ip)) {
    return banListHandler();
  }

  // Check username ban via session (if authenticated)
  const session = sessionFromRequest(req);
  if (session && isBanned(session.identity)) {
    return banListHandler();
  }

  return null;
}
