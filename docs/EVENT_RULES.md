# event rules

> This repo is synthetic event infrastructure. Nothing in it resembles a
> real company, product, or internal system. All names and flows are
> invented for the purpose of running this event.

## The event

- You fork this repo.
- You are assigned exactly one of the three surfaces: **auth**, **api**,
  or **identity**.
- You harden only your assigned surface, in under three hours.
- You deploy to a public URL (Vercel recommended).
- You submit your deployment URL and the surface you worked on.
- Judges read your deployment's admin dashboard and replay a fixed set
  of scoring probes against it.

## Submission deadline

**Submit your deployment URL before the event cutoff.** The exact
cutoff is announced on the day, in the event chat. Late submissions
are not scored.

## What you are allowed to modify

- `src/auth/` (auth team only)
- `src/api/` (api team only)
- `src/identity/` (identity team only)
- `src/shared/` — only if clearly necessary and only with additive,
  minimal changes. Judges will read your diff; keep it small.

## What you are **not** allowed to modify

- `lib/telemetry.ts`
- `lib/tenant.ts`
- `lib/store.ts` shape
- `middleware.ts`
- `app/_admin/*`
- `app/api/_admin/*`
- `tests/`
- `package.json` dependencies list (scripts are fine)

Deployments that modify out-of-scope files are **not scored**.

## What is out of scope for attacks

Judges will not test for, and you do not need to defend against:

- remote code execution
- SQL injection (there is no SQL)
- server-side request forgery
- cross-site scripting
- path traversal
- arbitrary file read/write

If your deployment exhibits any of those classes, that is a **starter
bug**, not a target — please flag it to the organizers.

## Fair play

- Don't attack other teams' deployments.
- Don't publish exploits against other teams' deployments during the
  event.
- Don't add telemetry that phones home to an external service.
- Don't introduce new production dependencies.
- Keep your diff readable — judges review the code, not just the
  runtime behavior.

## Questions

Ask in the event chat. Organizers will post clarifications there, and
clarifications apply to everyone.
