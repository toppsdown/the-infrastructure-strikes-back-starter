// Identity module surface used by route handlers.
// Blue teams: this is one of the primary hardening surfaces.

export { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from "./reset";
export {
  checkRateLimit,
  checkSignupRateLimit,
  clientIpFromRequest,
} from "./rateLimit";
export type { RateLimitResult } from "./rateLimit";
