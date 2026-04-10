import { timingSafeEqual } from "node:crypto";
import { getAdminToken } from "@/lib/config";

// Minimal admin/judge gate. Accepts the token via the x-admin-token header only.
// Query-string tokens are rejected (they leak via proxy logs, history, Referer).
export function checkAdmin(req: Request): { ok: true } | { ok: false; reason: string } {
  const expected = getAdminToken();
  const provided = req.headers.get("x-admin-token") || "";
  if (!provided) return { ok: false, reason: "missing admin token" };
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: "bad admin token" };
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "bad admin token" };
  return { ok: true };
}
