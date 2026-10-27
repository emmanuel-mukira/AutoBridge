# CRM API testing

## Local checks

From `apps/crm-api`:

```bash
npm run build
npm run verify:foundation
npm run verify:opportunities
npm run verify:activities
npm run verify:analytics
npm run verify:sales-history
npm run verify:predictions
npm run verify:prediction-reviews
npm run seed:dev
curl http://127.0.0.1:3000/health
```

Run `seed:dev` only with `NODE_ENV=development` against the local automotive database. It
uses the administrator credentials in the ignored API `.env` and adds seven sample clients,
two development users, contacts, mixed opportunity outcomes, confirmed sales, interactions,
follow-ups, three revenue-evidence states and the controlled product hierarchy.
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
- confirmed sale capture and correction without substituting estimated values;
- two-year boundary handling, future-outcome exclusion and exact USD aggregation;
- verified positive, verified-zero and unknown revenue states plus IBM band derivation;
- repeat development seeding without duplicate synthetic records.
- primary scoring for verified positive and verified-zero history;
- limited-history fallback for unknown history, immutable rescoring history and stale-score detection;
- primary/fallback SHAP additivity, immutable explanation persistence and old null-explanation compatibility;
- batched latest score summaries for scored, stale and unscored opportunity lists;
- ML timeout/failure behavior with no fabricated or persisted result.
- all three subjective prediction-review assessments, optional-comment validation and one review per reviewer per prediction;
- review owner/admin authorization, historical association and unchanged prediction probability, stage and outcome.

`verify:predictions` requires FastAPI to be running with the same `ML_API_TOKEN` and URL configured for Express. `verify:prediction-reviews` creates temporary saved predictions directly, exercises the authenticated review API, and removes all temporary rows. Manual review form behavior, explanation bars, board/list score badges, responsive behavior and dark mode remain browser acceptance work.
