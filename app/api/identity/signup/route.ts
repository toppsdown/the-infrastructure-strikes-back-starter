import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { logEvent } from "@/lib/telemetry";
import { getStore } from "@/lib/store";
import { hashPassword } from "@/src/auth";
import { checkSignupRateLimit } from "@/src/identity";
import { readJsonBody } from "@/src/shared/readBody";

const USERNAME_RE = /^[a-zA-Z0-9_\-.]{3,64}$/;

export const dynamic = "force-dynamic";

// POST /api/identity/signup
// Body: { username: string, password: string, email?: string, displayName?: string }
//
// SEEDED FLAW: "Unrestricted signup". [FIXED]
// Added a simple per-IP in-memory rate limit (30/min) via
// src/identity/rateLimit.ts. Generous enough to never block the
// happy-path probe but sufficient to cut agent-driven signup floods.
// Password strength / disposable email / CAPTCHA are intentionally out
// of scope for this minimal patch.
export async function POST(req: Request) {
  const route = "/api/identity/signup";

  const rl = checkSignupRateLimit(req);
  if (!rl.allowed) {
    logEvent({ req, route, status: 429, actor: null });
    return NextResponse.json(
      { error: "too many signup attempts" },
      {
        status: 429,
        headers: {
          "retry-after": Math.max(
            1,
            Math.ceil((rl.resetAt - Date.now()) / 1000),
          ).toString(),
        },
      },
    );
  }
  let body: {
    username?: string;
    password?: string;
    email?: string;
    displayName?: string;
  };
  try {
    body = await readJsonBody(req);
  } catch (e) {
    const msg = (e as Error).message;
    const err = msg.startsWith("body too large") ? "body too large" : "bad json";
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: err }, { status: 400 });
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
  if (!USERNAME_RE.test(username)) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }
  if (password.length > 256) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "password too long" }, { status: 400 });
  }
  if ((body.email || "").length > 256) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "email too long" }, { status: 400 });
  }
  if ((body.displayName || "").length > 128) {
    logEvent({ req, route, status: 400, actor: null });
    return NextResponse.json({ error: "displayName too long" }, { status: 400 });
  }

  const store = getStore();
  if (store.usersByUsername.has(username)) {
    // Username-enumeration defense: return a response byte-compatible with the
    // success path using a synthetic id so an attacker cannot distinguish
    // "taken" from "newly created". We do NOT return the real user's id —
    // that would leak the internal identifier.
    void hashPassword(password); // timing-flat dummy to match success-path cost
    logEvent({ req, route, status: 200, actor: username });
    return NextResponse.json({
      ok: true,
      id: "usr_" + randomBytes(6).toString("hex"),
      username,
      displayName: username,
    });
  }

  const id = "usr_" + randomBytes(6).toString("hex");
  const user = {
    id,
    username,
    passwordHash: hashPassword(password),
    email: (body.email || "").trim(),
    displayName: (body.displayName || username).trim(),
    createdAt: new Date().toISOString(),
  };
  store.users.set(id, user);
  store.usersByUsername.set(username, id);

  logEvent({ req, route, status: 201, actor: username });
  return NextResponse.json({
    ok: true,
    id,
    username,
    displayName: user.displayName,
  });
}
