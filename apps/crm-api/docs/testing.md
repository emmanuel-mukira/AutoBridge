# CRM API testing

## Local checks

From `apps/crm-api`:

```bash
npm run build
npm run verify:foundation
npm run verify:opportunities
npm run verify:activities
npm run verify:analytics
npm run seed:dev
curl http://127.0.0.1:3000/health
```

Run `seed:dev` only with `NODE_ENV=development` against the local automotive database. It
uses the administrator credentials in the ignored API `.env` and adds six sample clients,
contacts, open opportunities, interactions, follow-ups and the controlled product hierarchy.
The command is safe to repeat and does not reset the database. Changing the
credentials in `.env` before rerunning it updates the development administrator
and revokes existing sessions.

## Manual workflow coverage

When validating the CRM API, cover:

- authenticated session resolution through the API session;
- client, contact, opportunity and activity ownership plus administrator access;
- login, logout, session expiry, and CSRF failure paths.
- interaction/client/opportunity relationship validation;
- follow-up rescheduling and idempotent completion.
- analytics authentication, owner scope, filters, lifecycle counts and empty win-rate behavior;
- exact KES/USD pipeline conversion, activity counts and live aggregate updates.

Manual dashboard layout, responsive behavior and dark mode remain browser acceptance work. ML scoring remains a later checkpoint.
