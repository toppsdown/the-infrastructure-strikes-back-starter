// Optional step-up flow.
//
// How it's supposed to work:
//   1. User hits POST /api/auth/stepup with {code}
//   2. We compare {code} to the expected per-session challenge
//   3. If it matches, we mark the session as stepup=true
//
// SEEDED FLAW: fail-open step-up check.
// verifyStepupCode wraps its comparison in try/catch and returns true on
// any thrown error. Since it accesses fields on a potentially-missing
// input object without guarding first, a malformed body (e.g. {}) throws
// inside the try, gets swallowed, and the caller sees "verified".
//
// Blue teams: this is one of the three seeded auth flaws. Fix the
// fail-open behavior without breaking the happy path.

export type StepupInput = {
  code: string;
  expected: string;
};

export function verifyStepupCode(input: StepupInput): boolean {
  // SEEDED FLAW (fixed): fail-closed on malformed input. We no longer
  // swallow errors into a "verified" result. Guard the shape explicitly
  // and only return true on an exact match of non-empty strings.
  if (!input || typeof input.code !== "string" || typeof input.expected !== "string") {
    return false;
  }
  const a = input.code.trim();
  const b = input.expected.trim();
  if (a.length === 0 || b.length === 0) return false;
  return a === b;
}

// Event-wide challenge code. Read from env so it isn't leaked in source.
// Fail-closed: refuse to start if env var is missing or too short.
export function getStepupExpectedCode(): string {
  const code = process.env.STEPUP_CODE;
  if (!code || code.length < 4) {
    throw new Error("STEPUP_CODE required (>=4 chars)");
  }
  return code;
}
