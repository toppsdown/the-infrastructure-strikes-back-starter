# deploy

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000.

To run the happy-path functional suite against your local server:

```bash
npm run build
npm start &
TEST_BASE_URL=http://localhost:3000 ADMIN_TOKEN=letmein npm run test:functional
```

`npm test` (no suffix) runs only the instant structural/deploy-health
smoke checks — it does **not** boot a server. Use it in CI.

## Vercel (recommended)

1. Fork this repo on GitHub.
2. Go to https://vercel.com/new, import your fork.
3. No build-config changes are needed — Next.js is auto-detected.
4. Set the following environment variables in the Vercel project
   settings:

   | name             | required | value                                        |
   |------------------|----------|----------------------------------------------|
   | `TENANT_ID`      | yes      | short stable id, e.g. `team-ravens`          |
   | `ADMIN_TOKEN`    | yes      | long random string                           |
   | `SESSION_SECRET` | yes      | long random string (≥ 32 chars)              |

5. Click **Deploy**. First deploy should finish in under two minutes.
6. Open the deployed URL. Confirm the landing page shows your
   `TENANT_ID`.
7. Submit the deployment URL via the event submission form.

Target: from fork to submitted URL in under 20 minutes.

## Env var notes

- If `TENANT_ID` is missing, the app generates a random one on first
  boot. That is fine for local dev, but for the event you **must** set
  it so your deployment is identifiable to judges.
- If `ADMIN_TOKEN` is missing, it falls back to `letmein`. **Change it
  for any public deployment.**
- If `SESSION_SECRET` is missing, an ephemeral value is generated at
  boot. Sessions will not survive cold starts. For the event you
  **must** set it.

## Other hosts

Any host that runs Node.js 20+ and Next.js 14 works. This starter does
not use edge-runtime-only features.
