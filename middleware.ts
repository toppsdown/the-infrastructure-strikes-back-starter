import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Attach a request id to every request and stamp the start time so the
// telemetry logger can compute duration and correlate entries.
// Blue teams should NOT need to touch this file — it is event plumbing.
export function middleware(req: NextRequest) {
  const requestId =
    (globalThis.crypto as Crypto | undefined)?.randomUUID?.() ??
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });

  res.headers.set("x-request-id", requestId);
  req.headers.set("x-request-id", requestId);
  req.headers.set("x-request-start", String(Date.now()));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
