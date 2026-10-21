# AutoBridge CRM

AutoBridge CRM is an in-development B2B automotive customer and opportunity
management application. The repository contains a React frontend, an Express
API, local PostgreSQL configuration, and IBM-trained opportunity-scoring
research. The current application supports development login and customer
workflows; broader CRM and prediction integration are still in progress.

The [supervisor results report](docs/supervisor-model-results.md) summarizes
the two finalized Random Forest experiments and real sample predictions.
The saved automotive model is in [models/automotive_v1](models/automotive_v1).

## Application development

Start PostgreSQL from the repository root with `docker compose up -d postgres`.
Then run `npm run dev` independently in `apps/crm-api` and `apps/frontend`.
Keep local database and administrator credentials in the ignored `.env` files;
the sanitized examples show the required variable names. From
`apps/crm-api`, `npm run seed:dev` runs the
[central automotive seed](apps/crm-api/prisma/automotive/seed.ts) to prepare the
local development administrator and three sample customers without resetting
the database.

## Earlier dataset audit

The executed [IBM Watson notebook](notebooks/IBM_Watson_dataset.ipynb) audits the repository's
[sales CSV](datasets/IBM-sales-opportunity.csv), compares leakage-aware baselines,
and evaluates whether historical WON probabilities are useful. This earlier audit
preceded the finalized [Lean 3](notebooks/07_ibm_final_model.ipynb) and
[Automotive 5](notebooks/08_automotive_domain_analysis.ipynb) experiments.

## Run the earlier notebook locally

Open the repository in VS Code/Jupyter, select a Python environment containing
NumPy, pandas, matplotlib, scikit-learn and ipykernel, then run the notebook from
top to bottom. Use the same environment for the notebook kernel and VS Code's
Python interpreter to avoid misleading unresolved-import diagnostics.

Verified runtime: Python 3.12.3, NumPy 2.5.3, pandas 3.0.6,
scikit-learn 1.9.1, matplotlib 3.11.2 and ipykernel 7.4.0.
No package installations occur during notebook execution. XGBoost is optional
and was **not installed/tested** in this run; SHAP is replaced by permutation
importance. The grouped split takes roughly 90 seconds on the tested machine.

The loader searches the current directory and its parents for the repository
CSV. No upload or absolute machine path is required. In Colab, clone/mount the
whole repository and change into its directory first; opening the notebook
alone does not provide the CSV. Colab execution has not been tested.

## Main findings

- Raw data: **78,025 rows, 19 columns**, 22.59% Won, no blank missing values.
	The valid competitor category `None` is preserved.
- Remove 55 exact duplicate rows. Exclude 137 IDs with nonidentical records
	(278 deduplicated rows), consistent with unconfirmed line items; retain
	**77,692 single-record opportunities**. No opportunity ID crosses partitions.
- The conservative registration-time model uses **Supplies Subgroup, Region,
	Route To Market**. Even these inputs require the assumption that their recorded
	values match registration-time values. Amount, client bands/history and
	competitor status are evaluated separately as unverified timing assumptions.
- Train/calibration/validation/test sets are separate. No calendar dates or
	customer IDs support temporal or customer-level validation.

### Conservative model comparison (validation)

| Model | ROC-AUC | PR-AUC / AP | Brier ↓ |
|---|---:|---:|---:|
| Training-prevalence baseline | 0.5000 | 0.2253 | 0.1745 |
| Logistic Regression | 0.6006 | 0.3021 | 0.1706 |
| Random Forest | 0.6125 | 0.3067 | 0.1694 |

The raw Random Forest was selected using validation Brier; sigmoid calibration
did not improve it. On **15,539 held-out test opportunities**, ROC-AUC is
**0.6188**, AP **0.3105**, Brier **0.1689** (prevalence baseline **0.1745**).
At the validation-selected cutoff of 0.1844, precision is **0.2656**, recall
**0.7523**, and F1 **0.3926**. This cutoff is not a business-policy recommendation.

Mean prediction **22.54%** matches observed wins **22.52%**; fixed-bin calibration
error is **0.39 percentage points**. However, scores only span **3.3–42.5%** and
the 40–50% bin contains just 14 opportunities. Good aggregate calibration does
not imply strong ranking, reliable individual certainty, or support above 50%.

Adding amount and history assumptions raises Random Forest validation ROC-AUC
to **0.8206**, but performance does not prove that those values were available
before prediction. These models are not the approved primary baseline.

## Decision: RETAIN conditionally

Defensible for a bounded academic study of historical sales scoring, feature
availability and calibration—not a deployment-ready early-stage scoring system.
Verify source/provenance, usage rights, collection/sampling details and feature
timing before making operational claims: none is established by the filename.
No advertising, campaign uplift, email/SMS effectiveness, optimal contact channel
or causal intervention effect is supported.

The notebook retains audit tables, calibration bins/plots, genuine held-out
examples, a validated manual example, permutation importance and the full
**Dataset Viability Assessment**. Suitable directions are a leakage-aware
automotive opportunity-scoring study, a historical review dashboard, or a
feature-availability/calibration evaluation project.
