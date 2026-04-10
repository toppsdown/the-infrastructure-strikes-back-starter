import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { logEvent } from "@/lib/telemetry";
import { getStore } from "@/lib/store";
import { sessionFromRequest } from "@/src/auth";
import { badRequest, checkRateLimit, classifyError } from "@/src/api";
import { readJsonBody } from "@/src/shared/readBody";

export const dynamic = "force-dynamic";

// POST /api/actions/create
// Body: { title: string, body: string }
//
// SEEDED FLAWS:
//  - "Verbose internal error leakage": FIXED. The catch block now
//    routes through classifyError() — expected ApiErrors become 4xx
//    with a short sanitized message, unexpected errors become a
//    generic 500 and the full detail is written only to the server
//    log. Raw message/stack/request-body dumps no longer reach the
//    response body.
//  - "No action creation rate limit": FIXED. Per-session fixed-window
//    limit via checkRateLimit() keyed on session.userId.
const CREATE_LIMIT = 10; // actions
const CREATE_WINDOW_MS = 60_000; // per minute per user

export async function POST(req: Request) {
  const route = "/api/actions/create";
  const session = sessionFromRequest(req);
  if (!session) {
    logEvent({ req, route, status: 401, actor: null });
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const rl = checkRateLimit(
    `actions:create:${session.userId}`,
    CREATE_LIMIT,
    CREATE_WINDOW_MS,
  );
  if (!rl.ok) {
    logEvent({ req, route, status: 429, actor: session.identity });
    return NextResponse.json(
      { error: "rate limit exceeded" },
      {
        status: 429,
        headers: {
          "retry-after": String(
            Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  try {
    const rawBody = (await readJsonBody(req).catch((e: Error) => {
      if (e.message.startsWith("body too large")) throw badRequest("body too large");
      throw badRequest("invalid JSON body");
    })) as { title?: unknown; body?: unknown };

    const title = String(rawBody.title ?? "").trim();
    const content = String(rawBody.body ?? "").trim();
    if (!title) throw badRequest("title is required");
    if (title.length > 200) throw badRequest("title too long (max 200)");
    if (content.length > 4096) throw badRequest("body too long (max 4096)");

    const id = "act_" + randomBytes(6).toString("hex");
    const action = {
      id,
      ownerId: session.userId,
      title,
      body: content,
      createdAt: new Date().toISOString(),
    };
    getStore().actions.set(id, action);

    logEvent({ req, route, status: 201, actor: session.identity });
    return NextResponse.json(action, { status: 201 });
  } catch (e) {
    const { status, body } = classifyError(e, route);
    logEvent({ req, route, status, actor: session.identity });
    return NextResponse.json(body, { status });
  }
}
