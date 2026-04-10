import { NextResponse } from "next/server";
import { logEvent } from "@/lib/telemetry";
import {
  getStepupExpectedCode,
  sessionCookieHeader,
  sessionFromRequest,
  signSession,
  verifyStepupCode,
} from "@/src/auth";
import { checkRateLimit } from "@/src/api";
import { readJsonBody } from "@/src/shared/readBody";

export const dynamic = "force-dynamic";

const STEPUP_LIMIT = 5; // attempts
const STEPUP_WINDOW_MS = 60_000; // per minute per user

// POST /api/auth/stepup
// Body: { code: string }
//
// Verifies an optional step-up code. On success, marks the session as
// stepup=true and re-issues the session cookie.
//
// Rate-limited to 5 attempts/min per userId to prevent brute-forcing.
export async function POST(req: Request) {
  const route = "/api/auth/stepup";
  const session = sessionFromRequest(req);
  if (!session) {
    logEvent({ req, route, status: 401, actor: null });
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const rl = checkRateLimit(
    `stepup:${session.userId}`,
    STEPUP_LIMIT,
    STEPUP_WINDOW_MS,
  );
  if (!rl.ok) {
    logEvent({ req, route, status: 429, actor: session.identity });
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  let body: { code?: unknown };
  try {
    body = await readJsonBody<{ code?: unknown }>(req);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.startsWith("body too large")) {
      logEvent({ req, route, status: 400, actor: session.identity });
      return NextResponse.json({ error: "body too large" }, { status: 400 });
    }
    body = {};
  }

  const ok = verifyStepupCode({
    code: body.code as string,
    expected: getStepupExpectedCode(),
  });

  if (!ok) {
    logEvent({ req, route, status: 401, actor: session.identity });
    return NextResponse.json({ error: "stepup failed" }, { status: 401 });
  }

  const newToken = signSession({ ...session, stepup: true });
  logEvent({ req, route, status: 200, actor: session.identity });
  const res = NextResponse.json({ ok: true, stepup: true });
  res.headers.set("Set-Cookie", sessionCookieHeader(newToken));
  return res;
}
