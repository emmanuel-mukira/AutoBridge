# AutoBridge database and workflow

The active single-company PostgreSQL schema is `prisma/automotive/` (selected by `prisma.config.ts`). Its split model files and migrations are the source of truth. The old Lead, quotation and analytics modules are not mounted in the active API.

| Table | Purpose and key relationships |
| --- | --- |
| `User`, `Session` | `ADMIN` or `SALES_REP`; PostgreSQL-backed sessions belong to users. |
| `Account`, `Contact` | B2B customer account owned by a user; contacts belong to one account. Soft-deleted accounts are hidden by the active API. |
| `ProductGroup`, `ProductSubgroup` | Controlled automotive/RV hierarchy; opportunity selects a subgroup and derives its parent group. |
| `Opportunity` | Belongs to an account and owner; optional subgroup and route allow draft creation before scoring. Stores original `estimatedAmount`/`currency`, pipeline `stage`, separate final `outcome` and `outcomeAt`, optional `estimatedCloseAt`, and `estimatedAt`. |
| `Interaction`, `FollowUp` | Account activity with optional opportunity link; interactions record an actor and occurrence time; follow-ups record owner, due date and optional completion. |
| `AccountRevenueSummary` | Verified two-year account revenue amount/currency, coverage dates, evidence source, verification timestamp and optional verifier. No row means unknown; a verified zero is an explicit zero row. |
| `OpportunityPrediction` | Append-only model result with primary/fallback variant, model and adapter versions, input/conversion JSON snapshots, Won probability, optional explanation and prediction time. Primary requires a revenue summary; fallback has none. |
| `PredictionReview` | Separate human assessment/comment linked to prediction and reviewer. It does not set opportunity status or Won/Lost outcome. |

An account is created with a required owner, can be edited by its owner or an administrator, and is soft-deleted through `deletedAt`; its contacts remain stored but are hidden by the active API. Naming: `Account.businessName`, `Account.ownerId`, `Contact.accountId`, `Opportunity.estimatedAmount`, `Interaction.interactionType`, `ProductSubgroup.productGroupId`. Original money is decimal with an ISO currency code. Sales route is one of `FIELDS_SALES`, `OTHER`, `RESELLER`, `TELECOVERAGE`, `TELESALES`; the scoring adapter must map these to the exact IBM labels and convert the original amount to USD using a recorded rate/source/time. The ten supported subgroup/parent pairs come from `docs/ibm-crm-feature-mapping.md`; unknown revenue must never be coded as verified zero. The primary model uses five approved inputs, while the limited-history fallback omits revenue. Product and route fields may be absent until scoring is requested.

An opportunity starts `NEW`, can advance through `QUALIFYING`, `PROPOSAL`, `NEGOTIATION` and `CLOSED` (forward skips allowed), and cannot move backward or reopen. `CLOSED` requires `WON` or `LOST` plus `outcomeAt`; open stages require both to be null. Predictions and reviews do not change this commercial lifecycle. A future opportunity service must check account ownership, product/route validity, evidence age and account match, conversion provenance and model readiness before inference.

Implemented endpoints: `/api/auth/*`, `/api/accounts` and `/api/contacts`. The old customer/contact URL paths remain as temporary aliases but return the new field names. Account and contact CRUD use owner and role authorization. Planned for Issue #8: opportunity, interaction, follow-up and product lookup endpoints. Planned later: revenue evidence, scoring, prediction history/reviews and dashboard. The older frontend customer/contact feature modules still contain legacy types; the active account listing/detail/create screens use the new account contract.

From `apps/crm-api`, run `npx prisma validate`, `npx prisma generate`, `npx prisma migrate status`, `npm run seed:dev`, `npm run verify:foundation` (with the API running), and `node scripts/verify-schema.mjs`. Seed and schema verification require the ignored local development `.env`; the latter rolls back all test rows. Never run the seed against production.
