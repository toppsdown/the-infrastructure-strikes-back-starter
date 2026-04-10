import { NextResponse } from "next/server";
import { logEvent } from "@/lib/telemetry";
import { getStore } from "@/lib/store";
import { sessionFromRequest } from "@/src/auth";
import { readJsonBody } from "@/src/shared/readBody";

export const dynamic = "force-dynamic";

// GET /api/identity/profile
// Returns the authenticated user's profile.
export async function GET(req: Request) {
  const route = "/api/identity/profile";
  const session = sessionFromRequest(req);
  if (!session) {
    logEvent({ req, route, status: 401, actor: null });
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }
  const user = getStore().users.get(session.userId);
  if (!user) {
    logEvent({ req, route, status: 404, actor: session.identity });
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  logEvent({ req, route, status: 200, actor: session.identity });
  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  });
}

// POST /api/identity/profile
// Body: { userId?: string, displayName?: string, email?: string }
//
// SEEDED FLAW: "Profile update lacks proper subject verification". [FIXED]
// The subject is now derived exclusively from the authenticated
// session. Any userId / id field supplied in the request body is
// ignored. This prevents an authenticated caller from mutating
// another user's profile by naming a different userId.
export async function POST(req: Request) {
  const route = "/api/identity/profile";
  const session = sessionFromRequest(req);
  if (!session) {
    logEvent({ req, route, status: 401, actor: null });
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: { userId?: string; displayName?: string; email?: string };
  try {
    body = await readJsonBody(req);
  } catch (e) {
    const msg = (e as Error).message;
    const err = msg.startsWith("body too large") ? "body too large" : "bad json";
    logEvent({ req, route, status: 400, actor: session.identity });
    return NextResponse.json({ error: err }, { status: 400 });
  }

  // SEEDED FLAW [FIXED]: subject comes from the session only; any
  // body.userId is intentionally ignored.
  void body.userId;
  const targetUserId = session.userId;
  const user = getStore().users.get(targetUserId);
  if (!user) {
    logEvent({ req, route, status: 404, actor: session.identity });
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  if (typeof body.displayName === "string") {
    if (body.displayName.length > 128) {
      logEvent({ req, route, status: 400, actor: session.identity });
      return NextResponse.json({ error: "displayName too long" }, { status: 400 });
    }
    user.displayName = body.displayName.trim() || user.displayName;
  }
  if (typeof body.email === "string") {
    if (body.email.length > 256) {
      logEvent({ req, route, status: 400, actor: session.identity });
      return NextResponse.json({ error: "email too long" }, { status: 400 });
    }
    user.email = body.email.trim();
  }

  logEvent({ req, route, status: 200, actor: session.identity });
  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
  });
}
