import { NextResponse } from "next/server";
import { checkAdmin } from "@/src/shared/admin";
import { logEvent } from "@/lib/telemetry";
import { addBan, removeBan, listBans } from "@/src/shared/phase2/ban-list";
import { readJsonBody } from "@/src/shared/readBody";

export const dynamic = "force-dynamic";

// POST /api/_admin/ban
// Body: { identifier: string, action: "ban" | "unban" }
// Admin-token protected. Dynamically bans or unbans an IP or username.
export async function POST(req: Request) {
  const route = "/api/_admin/ban";
  const gate = checkAdmin(req);
  if (!gate.ok) {
    logEvent({ req, route, status: gate.status, actor: "admin?" });
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  let body: { identifier?: string; action?: string };
  try {
    body = await readJsonBody(req);
  } catch {
    logEvent({ req, route, status: 400, actor: "admin" });
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const identifier = (body.identifier || "").trim();
  if (!identifier) {
    logEvent({ req, route, status: 400, actor: "admin" });
    return NextResponse.json({ error: "identifier required" }, { status: 400 });
  }

  if (body.action === "ban") {
    addBan(identifier, "admin manual ban", -1); // permanent
    logEvent({ req, route, status: 200, actor: "admin" });
    return NextResponse.json({ ok: true, banned: identifier });
  }

  if (body.action === "unban") {
    const removed = removeBan(identifier);
    logEvent({ req, route, status: 200, actor: "admin" });
    return NextResponse.json({ ok: true, removed, identifier });
  }

  logEvent({ req, route, status: 400, actor: "admin" });
  return NextResponse.json(
    { error: "action must be 'ban' or 'unban'" },
    { status: 400 },
  );
}

// GET /api/_admin/ban — list all active bans
export async function GET(req: Request) {
  const route = "/api/_admin/ban";
  const gate = checkAdmin(req);
  if (!gate.ok) {
    logEvent({ req, route, status: gate.status, actor: "admin?" });
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const entries = listBans();
  logEvent({ req, route, status: 200, actor: "admin" });
  return NextResponse.json({ count: entries.length, bans: entries });
}
