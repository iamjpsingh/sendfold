# Cloudflare deployment

Deploy the frontend to Pages, the API to a separate Worker, metadata to D1, and uploads to a private R2 bucket. The Pages Function forwards `/api/*` through a service binding. Browser cookies remain on the frontend origin; the API Worker has no public workers.dev URL.

## Configure

Use Node 22.22+ and the repository's installed Wrangler. Authenticate your own Cloudflare account with `npx wrangler login` if needed.

Choose a unique Pages project name. `sendfold` is a working configuration name, not a reserved hostname. Change `apps/web/wrangler.jsonc` and its package deploy command if you choose a different name. Set `APP_ORIGIN` in `apps/api/wrangler.jsonc` to the exact HTTPS Pages or custom-domain URL, without a trailing slash.

From `apps/api`:

```sh
npx wrangler d1 create sendfold
npx wrangler r2 bucket create sendfold-files
```

Copy the returned D1 `database_id` into the existing `DB` entry in `wrangler.jsonc`. Keep the R2 bucket private; do not enable public access. These are real account resources; local development does not create them.

Generate two distinct secrets with `openssl rand -hex 32`, store them securely, then set them using the interactive prompts:

```sh
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put SETUP_TOKEN
```

The setup token authorizes creating the first administrator. No admin credentials are committed to the repository. After successful setup, normal account registration remains disabled.

## Migrate and deploy

From the repository root:

```sh
npm ci
npm run check
npm test
npm run build
npm run cf:migrate -w @sendfold/api
npm run deploy:api
```

## Git-connected automatic deployment

For a new installation, connect the same GitHub repository to **Pages** and **Workers Builds** in Cloudflare. Choose Git integration when creating Pages (a Direct Upload project cannot later be converted).

| Setting | Pages frontend | API Worker |
| --- | --- | --- |
| Production branch | `main` | `main` |
| Root directory | `apps/web` | `/` |
| Build command | `cd ../.. && npm ci && npm run build -w @sendfold/web` | `npm run check && npm test` |
| Output directory | `dist` | — |
| Deploy command | Managed by Pages | `npm run cf:migrate -w @sendfold/api && npm run deploy:api` |
| Build variables | `NODE_VERSION=22.22.2`, `SKIP_DEPENDENCY_INSTALL=true` | `NODE_VERSION=22.22.2` |

Disable preview deployments until a separate preview database, bucket, and API origin are configured. A Worker build token needs permission to deploy Workers and apply D1 migrations in the selected account; runtime authentication secrets belong in the Worker, not build variables or GitHub.

For a manual frontend release after the Git-connected Pages project exists, set `CLOUDFLARE_ACCOUNT_ID` in your shell and run `npm run deploy:web` from the repository root. Pages configuration does not accept `account_id`; the API Worker configuration does.

The web configuration binds `API` to `sendfold-api`. If either name changes, update the binding. Pages Functions must be included in the deployment; uploading only the static `dist` directory through the dashboard will omit the API proxy.

Open your production URL and complete first-run setup using `SETUP_TOKEN`. Verify login, one file upload, password-only guest access in a separate browser session, revocation, and a saved revision before sharing real client work.

Only the configured origin can mutate data. Preview deployment URLs require a separate backend environment and origin; do not point arbitrary preview URLs at production data. Keep frontend and API deployments on compatible versions.

## Limits and costs

All selected application libraries are open source. Hosting is separate. Password hashing uses Better Auth's scrypt implementation; benchmark CPU usage on Workers and choose a plan that supports it. Do not assume the free CPU allowance will handle password hashing, workbook uploads, or heavy usage.

The current app buffers uploads up to 25 MB. Direct multipart R2 uploads, large-file processing, automatic retention, and background conversion are future work. Storage history grows with every saved revision. Export and back up D1 and R2 together. Revoking a link prevents future access; it cannot erase already downloaded files.

See Cloudflare's current [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Pages service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Local Worker verification

From `apps/api`, create `.dev.vars` using `.dev.vars.example`, then:

```sh
npx wrangler d1 migrations apply sendfold --local
npx wrangler dev --port 8789 --var APP_ORIGIN:http://127.0.0.1:8789
```

The local D1/R2 state is separate from `.data/`, which belongs to the Node development adapter. `npm run cf:check` validates bundling but does not prove deployed production behavior.
