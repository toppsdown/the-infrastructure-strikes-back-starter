/**
 * Phase 2 scaffold — response tarpit (delay helper).
 *
 * NOT wired into the request path. Do not import from any handler
 * until Phase 2 activation at 7:00 PM PDT.
 *
 * Intended wiring (Phase 2):
 *   import { tarpit } from "@/shared/phase2/tarpit";
 *   if (classified.score > 0.8) await tarpit(5000);
 *   return response;
 *
 * Warning: long tarpits hold a Node event-loop timer per request.
 * Keep MAX_TARPIT_MS conservative to avoid exhausting serverless
 * execution budgets.
 */

export const MAX_TARPIT_MS = 15_000;

export function tarpit(ms: number): Promise<void> {
  const clamped = Math.max(0, Math.min(ms | 0, MAX_TARPIT_MS));
  if (clamped === 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, clamped);
    // Allow process to exit even if a tarpit is pending.
    if (typeof (t as unknown as { unref?: () => void }).unref === "function") {
      (t as unknown as { unref: () => void }).unref();
    }
  });
}

/**
 * Wraps an async handler so its response is delayed by `ms` ms.
 */
export async function withTarpit<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  await tarpit(ms);
  return await fn();
}
