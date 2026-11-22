# Production initialization and demonstration seed

Run these commands from `apps/crm-api` on a trusted machine or controlled release job connected to PostgreSQL. Neon does not run this Node/Prisma seed inside its SQL editor. Do not point the commands at the current development database or an established operational database.

## Before running

1. Select a new, empty database. Retain its direct migration connection URL and a write-capable seed connection URL with TLS settings supplied by the database provider. The API runtime later uses its own reviewed application-role URL under the existing name `DATABASE_URL_ADMIN`.
2. Set `DATABASE_URL_ADMIN`, `ADMIN_EMAIL=admin@autobridge.com`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, and `SEED_CONFIRM_DATABASE` in the process environment. The confirmation must equal the database name in the URL. The seed creates `samuel@autobridge.com` and `grace@autobridge.com`. Do not put account passwords in Render; Render needs the API's runtime secrets and database URL, while login passwords are hashed in PostgreSQL.
3. Install locked dependencies (`npm ci`) and generate the Prisma client (`npx prisma generate`). Run `npx prisma migrate deploy` with the direct migration URL. The seed never runs migrations or resets the database itself.
4. Choose **one** initial mode on the empty database:

   - `npm run seed:production` creates approved administrator and Sales Representative accounts and all 29 sourced automotive catalogue products.
   - `npm run seed:demo` creates those essentials plus labelled synthetic clients, sales records, quotations, real model predictions and SHAP explanations, follow-ups, and a weekly Knapsack comparison. Set `ML_API_URL` and matching `ML_API_TOKEN`; FastAPI `/ready` must succeed. Set `SEED_DEMO_WEEK_START` to a future UTC Monday. The initial week is `2026-11-23`; use a later Monday once that week begins. For a remote demo database, also set `SEED_CONFIRM_REMOTE_DEMO` to the exact hostname in `DATABASE_URL_ADMIN`.

The two modes are alternatives for initial setup. `seed:demo` refuses to add demonstration sales records to an existing production-only or operational database. For a disposable demo, start with a new empty database.

## Credentials and reruns

On first initialization, the seed uses three distinct passwords from `apps/crm-api/.env.production.seed` (or `SEED_CREDENTIALS_FILE`) if present. The file must be a regular file with mode `0600`, and each password must have 6 to 128 characters. If absent, the seed generates three distinct 32-byte random passwords in base64url form and writes the file with mode `0600`. The file is Git-ignored; `.env.production.seed.example` contains placeholders only. Save the real file in a protected backup or password manager before deleting the database. The seed hashes passwords with bcrypt, approves the accounts and requires a first-login password change. It never prints plaintext passwords. Keep this file off public build artifacts and do not assume it configures Render. The supplied demonstration passwords are predictable; replace them with unique random values before public production access.

Ordinary `seed:production` reruns verify the required accounts and catalogue and do not update operational records or passwords. `seed:demo` reruns only on a database matching the labelled demo shape; they reuse existing predictions and follow-ups. A failed demo scoring phase may be retried after FastAPI is healthy. If preflight reports inconsistent or unlabelled records, inspect or restore the database; do not bypass the guard.

Run `npm run verify:seed` for read-only account and catalogue checks. Set `SEED_DEMO_WEEK_START` to the seeded week to verify prediction availability, eligibility, capacity, grouping, repeatability, and the four-method comparison. The dated weekly demo can be verified only while its week remains eligible; recreate it in a new disposable database with a future week when needed.

To rotate a password on a populated database, generate a new 32-byte random base64url password, use the existing administrator reset-password or user change-password workflow, then securely update the matching retained credential so later recreation uses the rotated value. Keep file permissions at `0600`. The seed never rotates an existing account automatically. If the credential file is missing when an **empty** database is initialized, new credentials are generated; treat this as rotation and distribute them securely to the account holders.

After a deleted Neon database is recreated, run migrations and the chosen seed against that new database, using the retained credential file. This rebuilds only the defined initial state. Sales activity entered after initialization requires a database backup or other retained source for recovery.

## Demonstration scope

Catalogue products have sourced reference prices observed in October 2026; they are not live quotes. Client names, outcomes, follow-ups and revenue declarations are synthetic demonstration data. The ML probabilities and SHAP explanations are genuine `automotive_v1` inference results for those synthetic inputs. The demo has 15 primary and 5 limited-history predictions and leaves human reviews for an actual user to submit. The 25- and 30-hour comparisons use the same planner candidates; their weighted values are planning proxies, not observed sales gains.
