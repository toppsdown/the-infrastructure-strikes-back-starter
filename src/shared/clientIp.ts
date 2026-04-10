// Trusted client IP resolution for Vercel deployments.
// Vercel sets x-vercel-forwarded-for to the real client IP (single value,
// not attacker-controllable). x-forwarded-for is client-controllable and
// MUST NOT be trusted for security decisions.
export function getClientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  // Local dev fallback — x-real-ip set by some proxies
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  // Final fallback: a constant so all unknowns share a bucket (safer
  // than attacker-controlled xff)
  return "unknown";
}
