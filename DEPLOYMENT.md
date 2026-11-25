# AutoBridge deployment guide

Repository review: 23 November 2026; database migration update: 25 November 2026. The existing local database has been restored into Neon and verified. Render services and the Cloudflare frontend have not yet been deployed.

Target: **Cloudflare Pages → Render Express API → Neon PostgreSQL**, with **Express → Render private FastAPI service** for inference. Each service deploys independently from this monorepo. Replace example domains with domains you control.

## 1. What remains before deployment

| Area | Current repository state | Remaining work |
| --- | --- | --- |
| Frontend | Vite build and `VITE_API_URL` supported. | Connect Pages, configure API URL, set custom domain and test direct routes. |
| Express | `apps/crm-api/Dockerfile` installs locked dependencies, generates Prisma Client, compiles TypeScript and packages metadata plus the tracked aggregate JSON. `/health` is a process check. | Verify the built image against a disposable database; configure proxy handling and a separate database readiness gate. |
| FastAPI | `services/ml-api/Dockerfile` installs pinned inference dependencies and packages both frozen artifacts plus metadata; `/ready` checks model loading. | Verify image memory, cold start and inference in the target Render instance. |
| Database | Local business records and migration history restored into Neon; runtime reads `DATABASE_URL_ADMIN`. | Configure a restricted application role separately from the migration owner, then verify hosted API database access. |
| Authentication | Production cookies are secure, `SameSite=Lax`; exact-origin CORS and CSRF checks exist. | Set domain arrangement, fresh secrets and trusted origin; test real HTTPS login and state-changing requests. |
| Model Performance | Reads repository-relative metadata and the tracked aggregate `apps/crm-api/data/ibm-reliability-summary.json`. | Package both files in the Express image and verify the compiled endpoint. |
| First admin and sample data | Eight existing accounts and local business records restored; future follow-ups reuse saved predictions. | Use existing account passwords; review test-account access before public release. Do not seed this populated database again. |
| Acceptance | Earlier local checks are development evidence. | Build final images, verify cloud connections, browser workflows, capacity boundary behaviour and measured memory/cold starts. |

Both Dockerfiles use the repository root as build context. The root `.dockerignore` excludes local credentials, notebooks, datasets and build artifacts. There is no Render blueprint; configure the services separately.

Before release, verify the future-week candidate boundary identified in `docs/autobridge-documentation-revision-guide.md`; the current weekly service should be tested for excluding still-future activities belonging to a different week.

## 2. Choose domains before configuring authentication

Recommended arrangement:

```text
Frontend: https://app.your-domain.com       (Cloudflare Pages)
API:      https://api.your-domain.com       (Render web service)
ML:       http://<render-internal-host>:8000 (Render private service)
DB:       Neon connection string with TLS
```

HTTPS frontend/API subdomains under the same registrable domain work with the existing `SameSite=Lax` policy. They are still different origins: credentialed CORS and CSRF remain necessary. Keep API cookies host-only; a parent-domain cookie is unnecessary.

`https://project.pages.dev` and `https://api.onrender.com` are cross-site. The present cookie configuration is not sufficient for that arrangement. It requires a reviewed `SameSite=None; Secure` strategy and real-browser testing, including third-party-cookie restrictions, or a same-origin proxy. There is currently **no environment variable** that changes the hardcoded `sameSite` value; adding an invented `COOKIE_SAMESITE` variable will have no effect.

Use only the final trusted frontend origin in `FRONTEND_ORIGIN`, without a path or trailing slash. Preview deployments should use isolated staging services/data instead of a wildcard production-origin allowance.

## 3. Generate fresh production secrets locally

These commands generate new secrets when **you run them**. They do not use or replace existing development `.env` files. Run from the repository root in Bash.

The ignored `apps/crm-api/.env.production` and `services/ml-api/.env.production` are local handoff files for Render environment variables. Neither service loads those filenames automatically; set the values in each Render service's protected environment settings. Vite reads the ignored `apps/frontend/.env.production` at production build time, but it must contain only the public API origin in `VITE_API_URL`. Fill the Neon connection URL and actual service origins before deployment.

For a single value to paste directly into the hosting dashboard:

```bash
# Run separately for SESSION_SECRET and ML_API_TOKEN; never reuse one for both.
openssl rand -hex 32
```

For a local protected file containing both service values:

```bash
# Confirm the intended file is ignored before writing secrets.
git check-ignore --quiet .env.production.secrets || exit 1
umask 077
(
  set -o noclobber
  {
    printf 'SESSION_SECRET='
    openssl rand -hex 32
    printf 'ML_API_TOKEN='
    openssl rand -hex 32
  } > .env.production.secrets
)
```

`noclobber` prevents overwriting an existing file. Keep it in a password manager or another protected local store. Do not paste secrets into chat, screenshots, Git, build arguments or Dockerfiles. The seed reads separate account passwords from the ignored `.env.production.seed` file, or generates them if it is absent; they are not Express or FastAPI runtime variables.

Generate the database passwords through Neon's role-management interface and copy the provided connection strings. Database hostnames, users and passwords are supplied by Neon; `openssl` does not create a database role. Keep separate development, staging and production values.

## 4. Configure Neon

1. Create the production database/branch and retain its region and connection information.
2. Create a migration role with schema-management privileges and an application role with only the privileges needed for runtime reads/writes. Ensure migrations grant the application role access to tables, sequences and future migrated objects.
3. Copy both **direct** and **pooled** connection strings from Neon, keeping its supplied TLS settings. Use the direct migration-role URL for migrations. Start the API with a reviewed app-role URL; choose direct versus pooled after testing the Prisma `pg` adapter and connection budget.
4. Set the API's connection under the existing name `DATABASE_URL_ADMIN`. Despite the name, it can contain the restricted app-role URL. Setting only `DATABASE_URL` does not configure this checkout.

To migrate an explicitly selected production database, run from `apps/crm-api` after installing locked dependencies. The prompt below hides the URL and passes it only to that command:

```bash
cd apps/crm-api
read -rsp 'Neon DIRECT migration-role URL: ' neon_migration_url
printf '\n'
DATABASE_URL_ADMIN="$neon_migration_url" npx prisma migrate deploy
unset neon_migration_url
```

This command **changes the selected database**; confirm the destination before running. Prefer a controlled release/pre-deploy job, not migration on every API startup. Never run `migrate dev`, `db push`, reset commands or `seed:dev` against production.

The API uses `pg.Pool` with its defaults. Make the pool budget explicit before scaling instances. The follow-up collision safeguard uses a transaction-scoped advisory lock; verify it works through the selected Neon connection and Prisma adapter. `/health` currently returns a static response, so it does not prove Neon connectivity.

## 5. Package and deploy FastAPI on Render

Use `services/ml-api/Dockerfile` with the **repository root as Docker build context**, so it can copy `models/automotive_v1`. The root `.dockerignore` excludes populated environment files, datasets, virtual environments, Git data and unrelated files.

Package:

```text
services/ml-api/app/
services/ml-api/requirements.txt
models/automotive_v1/automotive_5_primary.joblib
models/automotive_v1/automotive_limited_history_fallback.joblib
models/automotive_v1/metadata.json
```

The image installs pinned inference dependencies from `services/ml-api/requirements.runtime.txt`. `requirements.txt` adds `pytest` and `httpx` only for local tests. Do not train or regenerate frozen models during image build.

Image working layout: application at `/app/services/ml-api`, artifacts at `/app/models/automotive_v1`. The Docker `CMD` starts one worker to avoid duplicating loaded forests and explainers until memory measurements justify more workers:

```bash
# Container command; requires the image's working directory to contain app/.
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
```

The Docker `CMD` uses a shell wrapper with `exec` so `${PORT}` expands and termination signals reach Uvicorn.

Render settings:

| Setting | Value |
| --- | --- |
| Service type | Private service, Docker runtime |
| Build context | Repository root; do not restrict context to `services/ml-api` |
| Dockerfile | `services/ml-api/Dockerfile` |
| Region | Same as Express; verify shared private-network access |
| `PORT` | `8000`, matching the internal port used by Express |
| `MODEL_ARTIFACT_DIR` | `/app/models/automotive_v1` |
| `ML_API_TOKEN` | Fresh generated value, identical to Express's token |
| Health/readiness | Render private services use a TCP health check; verify `/ready` separately from Express or a Render shell |

Copy Render's actual internal hostname and append the listening port for `ML_API_URL`; do not guess the hostname or use `127.0.0.1`. Cloudflare needs no ML URL or token. The private address cannot be tested directly from your laptop; use the API container or a Render shell.

In Render, create a **Docker private service** from the reviewed repository commit. Leave Root Directory unset, set Dockerfile Path to `services/ml-api/Dockerfile` and Docker Build Context to `.`. Keep the API and ML services in the same region. Use the Dockerfile's `CMD`, set `PORT=8000`, and supply `ML_API_TOKEN` through Render's protected environment settings. The private service has no public URL; Render checks its open port, while `/ready` must be checked separately after startup.

## 6. Package the Model Performance aggregate JSON

The tracked aggregate JSON is separate from the live CRM database seed. It contains probability-band counts, rates, mean predictions and provenance hashes, with no source opportunity rows. The local ignored replay was generated from the IBM dataset, Notebook 08 preparation and actual frozen-model predictions without training. Source redistribution rights remain unresolved, so do not package the record-level replay or dataset in the API image.

From the repository root, using the existing compatible Python environment:

```bash
services/ml-api/.venv/bin/python apps/crm-api/scripts/seed-reliability-demo.py
cd apps/crm-api
npm run package:reliability-summary
```

The selected environment must also have `nbformat`; it is not listed in the ML runtime requirements. Use an existing research environment if it already provides the dependencies. Verify recorded source/model hashes and review the resulting file before including it.

The source replay `apps/crm-api/data/ibm-reliability-demo.json` remains Git-ignored. The committed `apps/crm-api/data/ibm-reliability-summary.json` is sufficient for the endpoint on a clean checkout. The packaging command checks the replay against the frozen model hash and 1,000 distinct source IDs before deriving the aggregate with the same application reliability function; `node scripts/package-reliability-summary.mjs --check` verifies the committed result when the local replay is available. Do not regenerate either file during a production build without the reviewed source evidence.

Preserve the IBM demonstration label and distinguish it from application outcomes. Confirm dataset redistribution permissions before distributing replay records.

## 7. Package and deploy Express on Render

Use `apps/crm-api/Dockerfile`, again with the repository root as build context. Its build stage installs locked dependencies, generates Prisma Client and compiles TypeScript. The final image runs as the non-root `node` user with production dependencies. A separate `migrate` build target retains Prisma CLI for an explicit migration job; it is never run at API startup.

Commands inside the API build stage, from `apps/crm-api`:

```bash
npm ci
npx prisma generate
npm run build
```

The image packages compiled code, production dependencies/generated Prisma client, schema/migrations, `models/automotive_v1/metadata.json`, and `apps/crm-api/data/ibm-reliability-summary.json`. The ignored record-level `ibm-reliability-demo.json` is neither required nor packaged. The repository-relative layout used by `modelPerformanceService.ts` is preserved. Never supply production database credentials as image build arguments.

Render runtime variables:

```dotenv
NODE_ENV=production
# Render normally supplies PORT for a web service; the API already reads it.
DATABASE_URL_ADMIN=<Neon application-role connection string with TLS>
FRONTEND_ORIGIN=https://app.your-domain.com
SESSION_SECRET=<generated SESSION_SECRET>
ML_API_URL=http://<actual-render-internal-host>:8000
ML_API_TOKEN=<same generated ML_API_TOKEN as FastAPI>
ML_API_TIMEOUT_MS=5000
```

Start: use the Dockerfile `CMD` (`node dist/src/index.js`) from `/app/apps/crm-api`. Configure Render's HTTP health path as `/health`; add a separate database readiness check before treating this as a complete release gate. Express binds to `0.0.0.0` on Render's `PORT`.

In Render, create a **Docker web service** from the same reviewed repository commit. Leave Root Directory unset, set Dockerfile Path to `apps/crm-api/Dockerfile` and Docker Build Context to `.`. Use the Dockerfile's `CMD`; do not run a seed or migration in the start command. Set the HTTP health path to `/health`. The current checkout branch is `feat/automotive-app`; select the reviewed deployment branch after merging rather than assuming it is already on `main`.

| Variable | Service | Required | Purpose and source |
| --- | --- | --- | --- |
| `NODE_ENV` | Express | Yes: `production` | Enables secure session cookies and production behavior; set in Render. |
| `PORT` | Express | Render supplied | Listening port; Express reads it and otherwise defaults to `3000`. |
| `DATABASE_URL_ADMIN` | Express | Yes | Neon application-role connection URL with provider TLS settings. Despite the name, use a restricted runtime role. |
| `FRONTEND_ORIGIN` | Express | Yes | Exact deployed HTTPS frontend origin for CORS, CSRF and auth; set after choosing domains. |
| `SESSION_SECRET` | Express | Yes | Independent generated signing secret, at least 32 characters; set in Render. |
| `ML_API_URL` | Express | Yes for scoring | Actual Render private ML URL and port, learned after private service creation. |
| `ML_API_TOKEN` | Express and FastAPI | Yes for scoring | Same independent generated bearer token in both Render services. |
| `ML_API_TIMEOUT_MS` | Express | Optional | Inference timeout; source default is `5000`. |
| `LOG_LEVEL` | Express | Optional | Runtime log level; source default is `info`. |
| `DATABASE_URL_ADMIN` | Explicit migration job only | Yes for migrations | Neon **direct migration-role** URL, supplied only when running the `migrate` image target. No separate `DATABASE_URL` variable is used by this checkout. |
| `PORT` | FastAPI | Set to `8000` | Private listening port; Docker command defaults to `8000` locally. |
| `MODEL_ARTIFACT_DIR` | FastAPI | Optional | Image default resolves to `/app/models/automotive_v1`; set to that path if configuring explicitly. |
| `VITE_API_URL` | Cloudflare Pages | Yes | Public Express HTTPS origin, without `/api`; this is the only frontend deployment variable in this flow. |
| `ADMIN_EMAIL`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` | Explicit seed job only | Yes for initial seed | Initial administrator identity; see the seeding guide. The representatives' emails are defined by the seed. |
| `SEED_CONFIRM_DATABASE` | Explicit seed job only | Yes | Exact target database name; guard against seeding the wrong database. |
| `SEED_CONFIRM_REMOTE_DEMO`, `SEED_DEMO_WEEK_START` | Demo seed job only | Yes for remote demo | Exact remote hostname and a future UTC Monday for the selected demo week. |
| `SEED_CREDENTIALS_FILE` | Seed job only | Optional | Path to retained, owner-only account passwords; otherwise `.env.production.seed` in the seed working directory. |

The demo seed also needs the same `ML_API_URL` and `ML_API_TOKEN` as Express. `ADMIN_PASSWORD` is for the local `seed:dev` command, not a Render runtime variable; production account passwords come from the protected seed credential file or are generated on first initialization.

Configure `trust proxy` for the actual Render proxy arrangement before production rate-limit testing. The current login limiter keys by `req.ip`, and a missing proxy configuration can group users behind the proxy; an overly permissive configuration can trust forged client headers. Test the chosen setting rather than blindly trusting every forwarded header. Begin with one API instance because rate-limit storage is currently per process.

## 8. Deploy React/Vite on Cloudflare Pages

| Setting | Value |
| --- | --- |
| Root directory | `apps/frontend` |
| Framework | React/Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production variable | `VITE_API_URL=https://api.your-domain.com` |
| Custom domain | `app.your-domain.com` |

`VITE_API_URL` is a public build-time value and contains the API origin **without** `/api`; callers already include `/api/...`. Never put tokens, database URLs or session secrets in any `VITE_*` value. Changing the API URL requires a new frontend build.

Pages provides SPA fallback when there is no top-level `404.html`; verify refreshing a nested dashboard/opportunity route. Local Vite proxy behaviour does not apply to the deployed static build. Browser requests must reach the production API using credentialed requests and the allowed origin.

For a local check of the final frontend build, after dependencies are available:

```bash
cd apps/frontend
VITE_API_URL=https://api.your-domain.com npm run build
```

## 9. Initialize accounts, catalogue and optional demonstration records

The current Neon database was initialized by restoring the existing local PostgreSQL database, **not by rerunning a seed**. All original records in 16 application/migration tables and all sequence values were verified against the source. The eight existing accounts and their password hashes were preserved; old login sessions were excluded. All 13 migration records match the repository migration-file checksums. Do not initialize or seed this populated database again.

An append-only helper then added 96 follow-ups across the weeks beginning 30 November and 7 December 2026, with eight capacity records carrying forward existing weekly capacities. It used current saved predictions and existing quotations, preserved all original records, and made no model-inference calls. All eight weekly planner checks passed; a subsequent dry run planned zero additional rows. Protected backups and operational verification results are retained locally under the Git-ignored `docs/deployment_backups/`; they contain private recovery material and must not be published.

For a separate, fresh database where existing records are not being restored, the seed remains an alternative:

Follow [the tracked production seeding guide](apps/crm-api/docs/production-seeding.md). From `apps/crm-api`, apply `npx prisma migrate deploy` with the selected direct migration URL, then run either `npm run seed:production` or `npm run seed:demo` against a fresh database. The former creates approved accounts and the 29-item automotive catalogue. The latter additionally creates labelled synthetic sales examples, calls the private FastAPI service for genuine predictions/SHAP and verifies a 25/30-hour Knapsack comparison. `npm run verify:seed` is read-only. Set the exact database-name confirmation and, for remote demo insertion, the exact hostname confirmation. Do not run seeding at every API startup.

The account passwords are retained in `.env.production.seed` with restrictive permissions; the seed generates them if the file is absent. Keep a protected backup for a recreated database. Do not copy these plaintext passwords into Render environment variables. Replace predictable demonstration passwords with distinct random values before public production access. The API stores hashes and serves normal login and first-password-change workflows. A deleted Neon database can be rebuilt to the seed's initial state; operational sales changes require a separate backup.

## 10. Release checks and commands

Build both images from the repository root, matching Render's context and Dockerfile paths:

```bash
docker build -f apps/crm-api/Dockerfile -t autobridge-api:release .
docker build -f services/ml-api/Dockerfile -t autobridge-ml:release .
```

Local image checks on 23 November 2026: both images built; the Express image loaded its Prisma Client, exposed `/health` on a chosen `PORT`, retained schema/migrations, metadata and the aggregate JSON, and stopped cleanly. The FastAPI image loaded both frozen models, returned `/health` and `/ready`, generated the expected primary and fallback probabilities with available SHAP explanations, rejected an unauthenticated request, and stopped cleanly. A request from the Express image to the FastAPI image over a temporary private Docker network also passed. These checks used test-only values and no database; they do not establish Neon or Render behavior. After loading and two inference calls, the local ML container used about 184 MiB; choose a Render instance after measuring cold starts and load there.

The Express image build reported 10 production dependency advisories: one critical, eight high and one moderate. An audit from the built migration image identified `proxy-addr` as the critical package; `body-parser`, `path-to-regexp`, `qs`, Prisma-related packages and `zod` also need review. Triage and resolve applicable runtime advisories before public release. Do not treat the image build as a security approval.

For an explicit controlled migration operation, build the separate CLI target with `docker build --target migrate -f apps/crm-api/Dockerfile -t autobridge-api:migrate .`, then run it against the selected database with a protected direct migration-role `DATABASE_URL_ADMIN`. Do not set that direct URL on the normal Express service or run migration during every container start.

Validate images against a disposable staging database first. Pass runtime secrets through the hosting dashboard or protected env files; keep them out of command-line literals and image layers.

Public API liveness:

```bash
curl --fail --silent --show-error https://api.your-domain.com/health
```

From the Express container/Render shell, check private ML readiness without exposing its bearer token:

```bash
node --input-type=module -e 'const r = await fetch(`${process.env.ML_API_URL}/ready`); console.log(r.status, await r.text()); if (!r.ok) process.exit(1);'
```

Before go-live verify:

- HTTPS login, password change, CSRF, logout/session invalidation and cross-owner denial on the actual domains.
- API-to-Neon writes survive service restart; migration role is not used by normal application requests.
- Both scoring variants return genuine probabilities and explanations, persist history, and reject invalid/mismatched inputs.
- Model Performance can load metadata/aggregate JSON in the built image; application outcome bands stay distinct from the IBM demonstration.
- Opportunity creation includes the initial quotation; revision/rescoring and follow-up creation/completion refresh prioritization.
- No overlapping pending schedules, correct UTC week boundaries, overdue separation and capacity accounting.
- Direct frontend routes, mobile flows, cold starts, failures/timeouts and bounded staging load tests. Record service memory and latency instead of assuming earlier local measurements describe Render.

## 11. Rotation and configuration changes

| Value | How to rotate | Effect / verification |
| --- | --- | --- |
| `SESSION_SECRET` | Generate a new independent value; update Express and redeploy. | Treat as signing users out; verify login/logout and old-session rejection. |
| `ML_API_TOKEN` | Generate a new value; coordinate FastAPI and Express updates. | Current code accepts one token. Briefly mismatched services cannot score; plan a short scoring interruption or implement a reviewed dual-token transition first. |
| Neon app password | Prefer a new app role/credential with reviewed grants; update Express, verify writes, then revoke old access. | Old pooled connections may persist until restarted; verify the new connection before revocation. |
| Neon migration credential | Rotate separately in Neon and the release-job configuration. | Recheck migration access; do not grant the app role migration privileges. |
| Admin/sample passwords | Reset per account through the supported workflow; keep fresh per environment. | Verify forced password changes and access. |
| API/frontend domains | Update Pages build variable and Express origin allowlist, then redeploy/rebuild. | Recheck cookies, CORS, CSRF and nested routes. |

Do not regenerate secrets on each startup or Docker build. Local development can retain its independent secrets. Production rotation changes hosting configuration; it does not require committing real `.env` files.

## Sources and preservation

Official references: [Cloudflare build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pages SPA serving](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Render private networking](https://render.com/docs/private-network), [Render private services](https://render.com/docs/private-services), and [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

Keep Notebook 08, frozen artifacts, metadata and evaluation evidence for the final report. Review obsolete starter/Gaston assets separately; cleanup is not a reason to remove research comparisons. This deployment guide and the production seeding guide are Git-tracked instructions; neither contains credentials.
