# scoring

Judges score each deployment on three things:

1. **Does the happy path still work?** If users can't sign up, log in,
   or create an action, the deployment scores zero regardless of
   hardening quality. Judges run the happy-path probe first.
2. **Are the seeded flaws on your assigned surface fixed?** Judges run
   a fixed set of probes for each surface. Each fixed flaw is worth
   points.
3. **Is the diff clean?** Judges read your changes. Oversized,
   unfocused, or out-of-scope changes lose points.

## Scoring probes (per surface)

Each surface has three seeded flaws (see `docs/ARCHITECTURE.md` for the
list). Each fixed flaw is worth equal points.

### auth
- Step-up check cannot be bypassed by malformed input.
- Session identity cannot be set from client input at login time.
- Login has a reasonable per-username or per-IP rate limit.

### api
- Action ownership is derived from the session, not from request
  headers or query parameters.
- Internal error responses do not leak stack traces or request bodies.
- Action creation has a reasonable rate limit.

### identity
- Signup has rate limiting and basic validation.
- Reset tokens come from a cryptographic source with sufficient
  entropy.
- Profile update always acts on the session's own user id.

## What counts as "fixed"

A fix counts if a judge's probe for that flaw returns the expected
"safe" behavior **and** the happy-path probe still passes. A fix that
breaks the happy path is worth zero.

## What loses points

- Out-of-scope file changes (automatic zero; see `EVENT_RULES.md`).
- New production dependencies.
- Defensive code that only exists to make a single probe pass (judges
  read diffs).
- Blanket catch-all changes like "401 on every route" — breaks happy
  path, scores zero.

## Judging process

1. Judge opens `/_admin` on your deployment using their judge token.
2. Judge runs the happy-path probe.
3. Judge runs the per-surface probe set.
4. Judge reviews your diff for scope and quality.
5. Scores go on the event leaderboard.
