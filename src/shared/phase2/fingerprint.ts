/**
 * Phase 2 scaffold — attacker fingerprinting / classifier.
 *
 * NOT wired into the request path. Do not import from any handler
 * until Phase 2 activation at 7:00 PM PDT.
 *
 * Intended wiring (Phase 2):
 *   import { classify, tune } from "@/shared/phase2/fingerprint";
 *   const verdict = classify(req);
 *   if (verdict.score >= 0.7) { ...ban, honeypot, or tarpit... }
 *
 * Heuristic only. Tunable at runtime via `tune()` — expected to be
 * live-adjusted as we see Red Team behavior.
 */

export interface Verdict {
  score: number; // 0..1
  reasons: string[];
}

export interface Thresholds {
  burstWindowMs: number;
  burstMax: number;
  hopWindowMs: number;
  hopDistinctMax: number;
  uaMinLength: number;
}

const thresholds: Thresholds = {
  burstWindowMs: 10_000,
  burstMax: 30,
  hopWindowMs: 10_000,
  hopDistinctMax: 8,
  uaMinLength: 10,
};

export function tune(partial: Partial<Thresholds>): void {
  Object.assign(thresholds, partial);
}

export function getThresholds(): Readonly<Thresholds> {
  return { ...thresholds };
}

interface Track {
  hits: number[];
  paths: Array<{ path: string; at: number }>;
}

const tracks: Map<string, Track> = new Map();

const BAD_UA_PATTERNS: RegExp[] = [
  /curl\//i,
  /python-requests/i,
  /go-http-client/i,
  /wget/i,
  /libwww/i,
  /scrapy/i,
  /nikto|sqlmap|nmap|masscan|zgrab/i,
];

const BAD_HEADER_SIGNALS: Array<{ name: string; re: RegExp; reason: string }> = [
  { name: "x-forwarded-for", re: /(,.*){5,}/, reason: "deep x-forwarded-for chain" },
  { name: "x-scan", re: /./, reason: "x-scan header present" },
  { name: "x-attack", re: /./, reason: "x-attack header present" },
];

function extractIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function classify(req: Request): Verdict {
  const reasons: string[] = [];
  let score = 0;

  const ip = extractIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const now = Date.now();
  const url = new URL(req.url);
  const path = url.pathname;

  let track = tracks.get(ip);
  if (!track) {
    track = { hits: [], paths: [] };
    tracks.set(ip, track);
  }

  // Prune
  const burstCutoff = now - thresholds.burstWindowMs;
  track.hits = track.hits.filter((t) => t >= burstCutoff);
  const hopCutoff = now - thresholds.hopWindowMs;
  track.paths = track.paths.filter((p) => p.at >= hopCutoff);

  track.hits.push(now);
  track.paths.push({ path, at: now });

  // Burst
  if (track.hits.length > thresholds.burstMax) {
    score += 0.4;
    reasons.push(`burst:${track.hits.length} in ${thresholds.burstWindowMs}ms`);
  }

  // Endpoint hopping
  const distinct = new Set(track.paths.map((p) => p.path)).size;
  if (distinct > thresholds.hopDistinctMax) {
    score += 0.25;
    reasons.push(`hopping:${distinct} distinct paths`);
  }

  // User-agent
  if (!ua || ua.length < thresholds.uaMinLength) {
    score += 0.2;
    reasons.push("missing or short user-agent");
  } else {
    for (const re of BAD_UA_PATTERNS) {
      if (re.test(ua)) {
        score += 0.3;
        reasons.push(`ua-pattern:${re.source}`);
        break;
      }
    }
  }

  // Header signals
  for (const sig of BAD_HEADER_SIGNALS) {
    const v = req.headers.get(sig.name);
    if (v && sig.re.test(v)) {
      score += 0.25;
      reasons.push(sig.reason);
    }
  }

  if (score > 1) score = 1;
  return { score, reasons };
}

export function resetFingerprint(ip?: string): void {
  if (ip === undefined) tracks.clear();
  else tracks.delete(ip);
}
