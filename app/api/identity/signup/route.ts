import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { logEvent } from "@/lib/telemetry";
import { getStore } from "@/lib/store";
import { hashPassword } from "@/src/auth";
import { checkSignupRateLimit } from "@/src/identity";

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

  const store = getStore();
  if (store.usersByUsername.has(username)) {
    logEvent({ req, route, status: 409, actor: username });
    return NextResponse.json({ error: "username taken" }, { status: 409 });
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
