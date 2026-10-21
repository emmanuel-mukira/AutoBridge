# CRM API testing

## Local checks

From `apps/crm-api`:

```bash
npm run build
npm run verify:foundation
npm run seed:dev
curl http://127.0.0.1:3000/health
```

Run `seed:dev` only with `NODE_ENV=development` against the local automotive database. It
uses the administrator credentials in the ignored API `.env` and adds three sample customers.
The command is safe to repeat and does not reset the database. Changing the
credentials in `.env` before rerunning it updates the development administrator
and revokes existing sessions.

## Manual workflow coverage

When validating the CRM API, cover:

- authenticated session resolution through the API session;
- customer and contact ownership plus administrator access;
- login, logout, session expiry, and CSRF failure paths.

Opportunity, activity, and analytics workflows still need their own
implementation and verification.
