import { NextResponse } from "next/server";
import { logEvent } from "@/lib/telemetry";
import { getStore } from "@/lib/store";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  hashPassword,
  sessionCookieHeader,
  signSession,
  verifyPassword,
} from "@/src/auth";

export const dynamic = "force-dynamic";

const DUMMY_HASH = hashPassword("dummy-timing-equalizer-do-not-use");

// POST /api/auth/login
// Body: { username: string, password: string, identity?: string }
//
// SEEDED FLAWS:
//  - "Client-influenced session identity": if the body includes an
//    `identity` field, we stash it into the session as the display /
//    ownership handle instead of using the authenticated username.
//    Downstream checks trust session.identity — so an attacker who
//    authenticates as themselves can claim any identity they like.
//  - "No login rate limit": the store has a loginAttempts map for a
//    counter, but this handler never reads or writes it. Blue teams
//    should notice the dead hook and wire a real limit.
export async function POST(req: Request) {
  const route = "/api/auth/login";
  let body: { username?: string; password?: string; identity?: string };
  try {
    body = await req.json();
  } catch {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const username = (body.username || "").trim();
  const password = body.password || "";
  if (!username || !password) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json(
      { error: "username and password required" },
      { status: 400 },
    );
  }
  if (username.length > 64) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "username too long" }, { status: 400 });
  }
  if (password.length > 256) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "password too long" }, { status: 400 });
  }

  // SEEDED FLAW (fixed): no login rate limit. Check the in-memory
  // (ip, username) bucket before doing any credential work.
  const rl = checkLoginRateLimit(req, username);
  if (!rl.allowed) {
    logEvent({ req, route, status: 429, actor: username });
    return NextResponse.json(
      { error: "too many attempts" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const store = getStore();
  const userId = store.usersByUsername.get(username);
  const user = userId ? store.users.get(userId) : undefined;
  if (!user || !verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)) {
    logEvent({ req, route, status: 401, actor: username });
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  // SEEDED FLAW (fixed): client-influenced session identity. The
  // `body.identity` field is now ignored — signSession derives the
  // authoritative identity from the user record by userId.
  clearLoginRateLimit(req, username);

  const token = signSession({
    userId: user.id,
    identity: user.username,
    stepup: false,
    iat: Date.now(),
  });

  logEvent({ req, route, status: 200, actor: user.username });
  const res = NextResponse.json({ ok: true, identity: user.username });
  res.headers.set("Set-Cookie", sessionCookieHeader(token));
  return res;
}
