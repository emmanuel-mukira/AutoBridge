# AutoBridge — Final Scoring, Analytics and Development Data Corrections

## Objective

Fix the remaining scoring and analytics issues identified during manual review, improve the existing dashboard presentation and expand the local development seed data.

The application already has functional CRM workflows, quotations, Random Forest scoring, SHAP explanations, prediction history and Decision Support analytics.

**Make focused corrections. Do not redesign completed modules or introduce new infrastructure.**

Implement in this order:

1. Fix prediction freshness and duplicate scoring.
2. Fix Decision Support filtering and dashboard consistency.
3. Improve operational analytics charts and labels.
4. Expand the product catalogue and development seed data.
5. Run focused backend verification only.

## 1. Fix prediction freshness and duplicate scoring

### Current defects

A newly generated prediction is sometimes immediately labelled **Inputs changed**, even when the salesperson has not edited the opportunity.

Users can also repeatedly generate new predictions with identical model inputs, creating unnecessary prediction-history records.

### Investigate the root cause

Inspect:

- Opportunity scoring service.
- Primary/fallback model-selection logic.
- Model-ready feature preparation.
- Revenue-history evidence checks.
- Prediction snapshot persistence.
- Latest-prediction freshness calculations.
- Opportunity detail and list-level freshness logic.
- Decision Support freshness calculations.
- Currency conversion and Decimal precision.
- Any timestamp-dependent comparisons.

Identify the exact reason why a newly created prediction becomes stale.

Do not simply hide the stale label or force newly generated predictions to be Current.

### Required behaviour

Create or reuse one authoritative backend method for preparing and comparing the exact model-ready inputs.

The comparison must account for:

- USD opportunity amount, using consistent Decimal precision.
- Route to market.
- Canonical product group.
- Canonical product subgroup.
- Verified previous two-year revenue category, where applicable.
- Primary versus limited-history model selection.
- Model and preprocessing contract/version where relevant.

Compare normalized values rather than unstable JSON representations, display formatting, generated timestamps or object property ordering.

Revenue evidence should affect freshness when the actual eligible revenue state or model-ready value changes, not merely because a new verification timestamp was recorded.

A newly saved prediction must be Current immediately after a successful scoring request unless the underlying opportunity changes concurrently.

### Prevent unnecessary rescoring

When a salesperson requests scoring:

1. Build the current validated model-ready feature set.
2. Compare it with the latest saved prediction.
3. If the model variant, version and relevant inputs are unchanged, return the existing current prediction.
4. Do not call FastAPI again.
5. Do not create another prediction-history record.
6. Provide a friendly response such as "The current win probability is already up to date."

If relevant inputs changed, perform genuine inference and append a new immutable prediction.

Enforce this behaviour on the backend, not only by disabling the frontend button.

Handle closely repeated or concurrent scoring requests safely where practical, using existing application patterns.

### UI

- Display Current when the latest prediction matches current inputs.
- Display Inputs changed only when there is a genuine difference.
- Replace unnecessary Generate actions with an appropriate up-to-date state where useful.
- Keep the ability to rescore after genuine input changes.
- Preserve historical probabilities, SHAP explanations and reviews.

Do not alter frozen model artifacts, SHAP calculations or the approved feature set.

## 2. Fix Decision Support filtering and data refresh

### Current problem

Changing filters or sorting in Decision Support causes the entire dashboard to refresh visually.

### Required changes

- Keep existing dashboard cards and charts mounted while table filters or sorting change.
- Update only the data-dependent sections that require new results.
- Reuse TanStack Query caching and previous-data behaviour where appropriate.
- Avoid full-page loading screens or unnecessary component remounts.
- Preserve previous valid results while new filtered results are loading, with a subtle local loading indication.
- Avoid refetching independent dashboard sections when only table sorting changes.
- Preserve pagination and filter state consistently.

### Filter consistency

Align Decision Support with the Operational Dashboard's established filter controls and visual styles.

Reuse the existing:

- Month / Quarter / Year period selection.
- Sales Representative filtering for administrators.
- Product-group filtering.
- Relevant opportunity-stage filtering.

Retain prediction-specific filters such as Current, Stale and Not scored.

Use consistent filter state and query conventions where practical.

**Important:** Decision Support ranks currently open opportunities. Do not apply Won/Lost outcome filters to that table as though closed opportunities were still open.

If a reporting-period filter is added to Decision Support, define clearly whether it filters opportunities by creation date or prediction date. Use that meaning consistently, label it visibly and ensure users can still access older open opportunities that remain active.

Do not invent historical pipeline snapshots.

### Data consistency

Ensure:

- Decision Support and opportunity details use the same prediction-freshness calculation.
- Scoring coverage counts unique opportunities, not prediction-history records.
- Weighted opportunity values use current valid predictions.
- Stale and unscored records remain visible but have no fabricated weighted values.
- Filters apply to the correct authorized data scope.
- Sales Representatives see only their own opportunities.
- Administrators can view all representatives.

Preserve correct KES/USD formatting and Decimal-safe calculations.

## 3. Improve Operational Dashboard charts

### Product-group performance

Replace the current text-heavy product-group performance display with a compact, readable horizontal bar chart or similarly appropriate existing chart component.

Display:

- Product group.
- Won opportunity count.
- Lost opportunity count.
- Resolved win rate.

Use:

`Win rate = Won / (Won + Lost) × 100`

Clearly identify the denominator.

Replace ambiguous labels such as "resolved" with understandable wording such as **Completed opportunities (Won + Lost)**.

Groups with no completed Won/Lost opportunities should show "No completed sales outcomes" rather than a misleading 0% win rate.

### Sales-channel performance

Use the same compact chart approach for route-to-market performance.

Show actual Won/Lost performance by recorded sales channel, with a readable resolved sample count.

Reuse the existing chart library and design system.

Do not introduce another chart dependency.

### Representative performance

Retain the manager's representative-performance table.

Ensure it shows meaningful historical performance when valid historical records exist:

- Sales Representative.
- Won opportunities.
- Lost opportunities.
- Win rate.
- Confirmed Won value.

Continue applying role-based reporting scopes.

### Layout

Keep the current dashboard structure.

Do not increase the height of these panels unnecessarily.

Avoid extra charts that duplicate existing information.

Keep headings, legends, typography and spacing consistent.

## 4. Expand catalogue seed data

The current `Performance & Non-auto` group contains the trained subgroups:

- `Motorcycle Parts`
- `Shelters & RV`

Both currently lack seeded individual products.

Find suitable real products sold in the Kenyan market and add a small, credible selection under each existing subgroup.

### Suggested research sources

Motorcycle parts:

- https://dajas.co.ke/product-category/spares
- https://www.gurumotorcycles.co.ke/

Shelters and RV-related supplies:

- https://www.decathlon.co.ke/20191-shelters-tarps
- https://pickupstoreke.com/product-category/outdoor-camping/

Examples worth verifying include motorcycle chains and sprockets, vehicle side awnings, camping tarps and camping shelters.

For every new product:

- Verify product name and specifications.
- Verify the exact price and selling unit.
- Record a source URL and observation date.
- Store prices in KES.
- Keep `PUBLIC_RETAIL_REFERENCE` where the price is an advertised retail price.
- Do not claim an advertised price is verified wholesale pricing.
- Do not use vague "from" prices as exact variant prices.
- Preserve the existing ten canonical model subgroups.
- Use stable internal SKUs and idempotent upserts.

Do not create arbitrary new model categories.

Maintain the current no-automatic-tax quotation calculation contract. Do not silently represent a tax-exclusive supplier listing as a tax-inclusive final price.

## 5. Expand local opportunity seed data

Update the canonical development seed file to create **approximately 12 open demonstration opportunities**.

These 12 opportunities must remain Open so the user can manually progress, score and close them.

Distribute them across:

- New.
- Qualifying.
- Proposal.
- Negotiation.

Assign them between the two existing Sales Representatives.

Use multiple clients, routes to market, product groups and subgroups.

Every opportunity must have:

- Valid product selections and quantities.
- A calculated opportunity amount.
- Its appropriate quotation draft or current quotation.
- A valid principal ML subgroup.
- Correct ownership and relationships.

Use the existing quotation calculation rules.

### Revenue-history scenarios

Aim for approximately:

- Six open opportunities associated with clients having genuinely complete, verified two-year sales records within the fictional development dataset.
- Six open opportunities whose previous two-year revenue is unavailable or not reliably verified.

Include a useful spread of positive revenue categories where supported.

Do not simply set revenue verification flags without the supporting fictional transaction history and coverage evidence required by the existing backend rules.

Do not classify missing history as verified zero.

Ensure both Random Forest variants can be exercised using genuine application inputs.

Do not seed manually invented probabilities or SHAP results.

## 6. Seed separate historical salesperson performance

The 12 new opportunities must all remain Open.

**Separately**, seed a modest set of clearly fictional historical Won and Lost opportunities so that the existing Operational Dashboard can demonstrate representative performance and product/channel win-rate calculations.

Requirements:

- Assign historical records across both Sales Representatives.
- Include both Won and Lost outcomes.
- Use coherent historical creation and outcome dates.
- Include confirmed sale values only for genuinely Won records within the fictional scenario.
- Do not use quotation acceptance alone as a Won outcome.
- Use valid product group, subgroup and sales-channel relationships.
- Retain realistic quotation and sale-value consistency.
- Ensure the historical records appear in the intended monthly, quarterly and yearly reporting periods according to the dashboard's defined date rules.
- Do not seed model probabilities, SHAP values, reviews or claimed model-performance results.

Keep these records distinguishable in the seed source as fictional historical demonstration records.

The objective is to populate operational reporting, **not to fabricate evidence of model accuracy or commercial impact**.

## 7. Development user accounts

Retain one Administrator account and two Sales Representative accounts.

Use simple, consistent local demonstration email addresses, for example:

- `samuel@autobridge.local`
- `grace@autobridge.local`

Keep the existing administrator account unless a documented change is necessary.

Set straightforward but nontrivial development-only passwords through the established local environment/seed configuration.

Avoid hardcoding reusable plaintext passwords in tracked application source.

In the completion report, clearly state the local demonstration login emails and explain how to obtain or set the corresponding passwords. If the seed process explicitly provisions known disposable local-only passwords, provide those credentials to the user in the completion report, not in a committed file.

Ensure the two Sales Representatives have separate opportunity ownership, and the Administrator retains organization-wide visibility.

Do not use these demonstration credentials for production deployment.

## 8. Database and seed safety

Modify the canonical seed file rather than inserting records manually.

- Preserve the current Prisma schema and migration history unless an actual implementation defect requires a focused correction.
- Make seed execution repeatable and idempotent.
- Preserve existing user-created development records where possible.
- Do not overwrite immutable prediction history.
- Do not reset the database by default.
- Do not access or reset Neon, production or shared databases.
- Validate product relationships, quotation totals, user assignments and historical outcome integrity.

If a local reset is genuinely required, identify why and report it before performing any destructive action.

## 9. Lean verification

Do not run extensive repository-wide checks.

Run focused backend verification only for:

1. Newly generated prediction is Current when inputs remain unchanged.
2. Repeated scoring with identical inputs does not invoke ML or create another prediction.
3. Genuine feature changes produce a new prediction and preserve history.
4. Opportunity details and Decision Support agree on freshness.
5. Analytics filtering returns the correct scoped records and totals.
6. Product-group, channel and representative win-rate calculations.
7. Seeded opportunity, product and user counts.
8. Primary/fallback revenue-history scenarios.
9. Correct authorized endpoint responses and currency arithmetic.

Use existing scripts or small targeted checks.

Do not run Playwright, browser automation, full Python test suites, unrelated regression suites or repository-wide verification.

Run targeted TypeScript compilation only if necessary.

The user will manually inspect the frontend, charts, filters, predictions and account logins.

## Restrictions

- No model retraining.
- No new ML features.
- No per-product predictions.
- No automatic scoring during dashboard loading.
- No fabricated prediction or business-impact metrics.
- No changes to quotation outcome rules.
- No unrelated UI redesign.
- No deployment.
- No automatic commits.
- No database reset without a justified, verified local-only reason.

## Completion report

Keep the report concise and state:

1. Root cause of incorrect prediction staleness.
2. Exact deduplication rule implemented for scoring.
3. Decision Support filter and refresh improvements.
4. Operational chart changes.
5. New sourced catalogue products and their prices.
6. Number of open and historical opportunities seeded.
7. Verified versus unknown revenue-history scenarios.
8. Sales Representative login details for local testing.
9. Focused backend checks run and their results.
10. Any remaining limitations.

The objective is to leave AutoBridge with reliable scoring behaviour, consistent analytics, representative development data and a clean interface before deployment preparation.