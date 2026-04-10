/**
 * Phase 2 fight-back tooling — barrel export.
 *
 * ============================================================
 *   DO NOT FLIP `ENABLED` TO TRUE BEFORE 7:00 PM PDT.
 *   Event rules forbid deploying fight-back code in Phase 1.
 *   Deploying with ENABLED=true before the window = disqualification.
 * ============================================================
 *
 * All modules here are scaffolded and importable but MUST NOT be
 * wired into any request path until the Phase 2 activation window
 * opens. See docs/EVENT_RULES.md.
 */

export const ENABLED: boolean = false;

export * from "./rate-limiter";
export * from "./ban-list";
export * from "./tarpit";
export * from "./honeypot";
export * from "./fingerprint";
export * from "./deception";
