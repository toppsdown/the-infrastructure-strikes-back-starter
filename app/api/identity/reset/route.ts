import { NextResponse } from "next/server";
import { logEvent } from "@/lib/telemetry";
import { getStore } from "@/lib/store";
import { hashPassword } from "@/src/auth";
import { RESET_TOKEN_TTL_MS, generateResetToken } from "@/src/identity";
import { hashResetToken } from "@/src/identity/reset";
import { checkRateLimit, clientIpFromRequest } from "@/src/identity/rateLimit";

export const dynamic = "force-dynamic";

const MAX_USERNAME_LEN = 64;
const MAX_TOKEN_LEN = 128;
const MAX_PASSWORD_LEN = 256;

// POST /api/identity/reset
//
// Two modes, selected by body.mode:
//   { mode: "request", username }
//     -> creates a reset token bound to the user, returns it in the
//        response. (Event infra has no email; this is fine.)
//   { mode: "confirm", token, newPassword }
//     -> swaps the user's password hash if the token matches and is
//        not expired.
//
// See src/identity/reset.ts for the seeded weak-token flaw.
export async function POST(req: Request) {
  const route = "/api/identity/reset";
  let body: {
    mode?: string;
    username?: string;
    token?: string;
    newPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // F5: per-IP rate limit covering both modes (5/min).
  const rl = checkRateLimit(
    `reset:${clientIpFromRequest(req)}`,
    5,
    60 * 1000,
  );
  if (!rl.allowed) {
    logEvent({ req, route, status: 429, actor: null });
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // F4: bound input lengths.
  if (
    (typeof body.username === "string" && body.username.length > MAX_USERNAME_LEN) ||
    (typeof body.token === "string" && body.token.length > MAX_TOKEN_LEN) ||
    (typeof body.newPassword === "string" && body.newPassword.length > MAX_PASSWORD_LEN)
  ) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "input too long" }, { status: 400 });
  }

  const store = getStore();

  if (body.mode === "request") {
    const username = (body.username || "").trim();
    if (!username) {
      logEvent({ req, route, status: 400, actor: null });
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }
    const userId = store.usersByUsername.get(username);
    if (!userId) {
      // F6: identical shape + flat timing vs. the found-user path. Do a
      // dummy token generation so both paths do the same work.
      void generateResetToken();
      logEvent({ req, route, status: 200, actor: username });
      return NextResponse.json({ ok: true });
    }
    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    // F3: keyed by hash; the `token` field holds the hash too so plaintext
    // is never persisted anywhere in the store.
    store.resetTokens.set(tokenHash, {
      token: tokenHash,
      userId,
      expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    });
    console.log("[reset] token issued user=" + username + " tokenPrefix=" + token.slice(0,6));
    logEvent({ req, route, status: 200, actor: username });
    return NextResponse.json({ ok: true });
  }

  if (body.mode === "confirm") {
    const token = (body.token || "").trim();
    const newPassword = body.newPassword || "";
    if (!token || !newPassword) {
      logEvent({ req, route, status: 400, actor: null });
      return NextResponse.json(
        { error: "token and newPassword required" },
        { status: 400 },
      );
    }
    const tokenHash = hashResetToken(token);
    const entry = store.resetTokens.get(tokenHash);
    if (!entry || entry.expiresAt < Date.now()) {
      logEvent({ req, route, status: 400, actor: null });
      return NextResponse.json(
        { error: "invalid or expired token" },
        { status: 400 },
      );
    }
    const user = store.users.get(entry.userId);
    if (!user) {
      logEvent({ req, route, status: 404, actor: null });
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    user.pwdVersion = (user.pwdVersion ?? 0) + 1;
    user.passwordHash = hashPassword(newPassword);
    store.resetTokens.delete(tokenHash);
    logEvent({ req, route, status: 200, actor: user.username });
    return NextResponse.json({ ok: true });
  }

  logEvent({ req, route, status: 400, actor: null });
  return NextResponse.json(
    { error: "mode must be 'request' or 'confirm'" },
    { status: 400 },
  );
}
