# IBM-to-CRM Feature Mapping

**Purpose:** a feature-adapter contract for the finalized IBM Automotive 5 case-study model. It is a documented mapping proposal, not proof that an IBM-trained model applies to a Kenyan automotive business.

## 1. Dataset provenance and mapping evidence

The historical third-party [Sales Win Loss GitHub Wiki](https://github.com/dataseer-carl/data-lake/wiki/sales-win-loss), edited January 2018, describes a 19-column, 78,025-row IBM Watson Sales Win/Loss CSV. It documents field labels, category values and bands used below. It describes a single-period opportunity log, but does not verify the original organization, commercial rights, exact data-generating process, or whether every predictor was available before a real decision. Treat it as a historical data dictionary, not a production integration specification.

Repository inspection confirms that the selected Automotive 5 notebook uses the following field types in its IBM training data: amount is an integer number; revenue-history is an integer category (`0`–`4`); route, group and subgroup are strings. The notebook’s visible preprocessing declares one-hot encoding for categorical fields and `log1p` then `StandardScaler` for raw amount. The adapter must provide raw USD amount exactly once: it must not apply `log1p` or scaling itself.

The approved fitted artifacts are versioned as `models/automotive_v1/automotive_5_primary.joblib` and `models/automotive_v1/automotive_limited_history_fallback.joblib`; [metadata.json](../models/automotive_v1/metadata.json) records their contract, parameters, encoder categories and transformed feature order. Notebook 08 reproduced its frozen validation/test probability metrics before export and checked that original-versus-reloaded primary and fallback probabilities agree to `1e-12` on fixed reference rows. Load these files with `joblib.load()` and validate the metadata version/feature contract before inference.

## 2. Final Automotive 5 input contract

| Model input | Adapter value and type | Owner |
|---|---|---|
| `Opportunity Amount USD` | Non-negative raw numeric USD estimate | Opportunity |
| `Revenue From Client Past Two Years` | Integer code `0`–`4`, derived from verified account history | Account/history service |
| `Route To Market` | Exact IBM string | Opportunity workflow |
| `Supplies Group` | Exact IBM parent string, derived from subgroup | Product catalogue |
| `Supplies Subgroup` | Exact IBM child string | Product catalogue |

The selected estimator is raw-probability Random Forest Automotive 5: `n_estimators=200`, `max_depth=12`, `min_samples_leaf=30`, `max_features=0.8`, `random_state=42`. Its final IBM automotive test values are ROC-AUC 0.81441, AP 0.60221 and Brier 0.13079. The academic F1 threshold is 0.23168; it is not a commercial-priority rule.

## 3. Opportunity amount and currency conversion

The historical dictionary describes opportunity amount as the sum of sales-representative line-item revenue estimates. The CRM should store the original amount, currency, estimate date, conversion rate and conversion source. For this mapping demonstration only, use **USD 1 = KES 129**:

`amount_usd = amount_kes / 129`

KES 250,000 becomes USD 1,937.98. This is illustrative, not a live rate, market-normalisation method, or permanent production rate. The saved primary artifact applies `log1p` then its fitted `StandardScaler` to the raw USD amount; it does not adapt the model to Kenyan economics. Do not add an arbitrary multiplier, manually scale/log-transform an input, refit the scaler, treat unknown amount as zero, or accept a negative value. Confirmed zero is a permitted numeric value in the IBM training data; unknown amount is a validation failure for inference.

## 4. Previous-client revenue bands

The historical dictionary calls this revenue identified from the client in the past two years. The proposed CRM policy is: sum **verified qualifying invoice amounts** for the account in the 24 months ending before the prediction timestamp. This is an application policy, not a proven IBM-equivalent definition: the historical source does not say whether its revenue was invoiced, recognized, paid, or another basis.

| Code | Historical USD band | Approximate illustrative KES band |
|---:|---|---|
| 0 | None | Verified no qualifying revenue |
| 1 | USD 1 to < USD 50,000 | KES 129 to < KES 6,450,000 |
| 2 | USD 50,000 to < USD 400,000 | KES 6,450,000 to < KES 51,600,000 |
| 3 | USD 400,000 to < USD 1,500,000 | KES 51,600,000 to < KES 193,500,000 |
| 4 | USD 1,500,000 or more | KES 193,500,000 or more |

The historical definition leaves a gap for positive values from USD 0 to less than USD 1. The adapter must reject/flag that case until an approved policy exists; it must not round it into code 0 or 1. Store account-history start/end coverage, verification status and calculation timestamp. Code 0 means verified zero only; it does not establish that an account is new.

## 5. Route-to-market categories

The exact IBM values are `Fields Sales`, `Other`, `Reseller`, `Telecoverage` and `Telesales`. The model receives those exact strings. A CRM may display friendly labels and descriptions, but a validated adapter must map to these strings without silently renaming them. The historical source does not explain the operational difference between Telecoverage and Telesales, so these must remain separate controlled values until a business mapping is approved. Lead source and route-to-market are separate concepts. An unknown route is not automatically `Other`; it is unsupported for inference.

## 6. Automotive product hierarchy

| Supplies Group | Supplies Subgroup |
|---|---|
| Car Accessories | Batteries & Accessories |
| Car Accessories | Exterior Accessories |
| Car Accessories | Garage & Car Care |
| Car Accessories | Interior Accessories |
| Car Accessories | Replacement Parts |
| Car Accessories | Towing & Hitches |
| Car Electronics | Car Electronics |
| Performance & Non-auto | Motorcycle Parts |
| Performance & Non-auto | Shelters & RV |
| Tires & Wheels | Tires & Wheels |

These ten subgroups define the selected automotive/RV-labelled subset. `Performance Parts` is excluded because its domain meaning is ambiguous. In particular, preserve the IBM parent `Performance & Non-auto` for Motorcycle Parts and Shelters & RV. A controlled subgroup selection should determine its parent group; reject an inconsistent pair. An opportunity covering several categories is an application-design question and must not be forced into an arbitrary single subgroup merely to obtain a score.

## 7. Other IBM fields retained for reference

`Client Size By Revenue` is coded from < USD 1m, USD 1m–<10m, USD 10m–<50m, USD 50m–<100m, and USD 100m+. `Client Size By Employee Count` is coded from <1,000, 1,000–<5,000, 5,000–<10,000, 10,000–<30,000, and 30,000+. These broad IBM categories may poorly distinguish Kenyan SMEs and are not required for Automotive 5 scoring.

IDs/names are identifiers rather than predictors. Outcome/close fields, sales-stage durations and outcome-derived ratios risk leakage. Competitor information had weak evidence and uncertain prediction-time availability. Deal Size Category duplicates amount. Retain these fields in CRM when useful, but do not add them to this frozen contract.

## 8. CRM ownership, missingness and applicability checks

Accounts own verified transaction history and coverage. Opportunities own amount, currency, estimate date and route. The catalogue owns the controlled product hierarchy. Salespeople must never guess IBM revenue codes.

- Complete two-year coverage with no qualifying revenue: use primary-model code 0 after approving the source-code mapping.
- Complete coverage with positive revenue: convert then use the exact band boundary.
- Unknown/incomplete history: never substitute zero. Use the retained limited-history fallback only if its approved saved pipeline and required amount/route/group/subgroup inputs are available.
- Unsupported route/product, invalid hierarchy, missing amount, negative amount, or a multi-category product without an approved representation: leave the CRM record valid but reject model inference with an information-quality reason.

Before inference, require compatible categories, raw USD amount, verified history state, an approved artifact version and its matching feature-contract version. A value within an IBM range does not demonstrate Kenyan applicability. Record the source values, conversions, coverage period and validation decision with every future prediction.

## 9. Mapping verification results and limitations

Notebook 09 verifies the historical band boundaries, the actual fitted encoder categories, transformed order, source-data hierarchy and real saved-model inference without fitting or refitting a model. The primary encoder contains history integers `0–4`, all five routes, the four observed groups and all ten selected subgroups; its amount branch is `log1p` followed by a fitted `StandardScaler`. The four illustrative Kenyan amounts convert to USD 1,937.98, 7,751.94, 77,519.38 and 3,875.97; they sit approximately at the 5.77th, 13.80th, 64.62nd and 8.17th percentiles of the IBM automotive training amount distribution. These are distribution positions, not win probabilities or transfer evidence.

| Case | Model | Raw predicted Won probability |
|---|---|---:|
| A: verified no history | Automotive 5 primary | 0.38613 |
| B: lower revenue | Automotive 5 primary | 0.85528 |
| C: higher revenue | Automotive 5 primary | 0.61912 |
| D: history unavailable | Automotive limited-history fallback | 0.50894 |

These values are reproducible outputs of the saved IBM artifacts, not calibrated Kenyan probabilities or commercial-priority recommendations. The notebook rejects unsupported product values, invalid parent/child pairs and missing amount before calling `predict_proba`; it routes unavailable history only to the saved fallback.

## 10. Small Kenyan B2B opportunity compatibility

Notebook 09 holds route/product constant as `Reseller` / `Car Accessories` / `Replacement Parts` and varies only estimated amount. The saved primary receives raw USD amounts and retains its fixed IBM `log1p` plus scaler preprocessing; no Kenyan scaling factor, refit, calibration, or threshold change is applied.

| USD amount band in original training partition | Opportunities | Share | Descriptive IBM Won rate |
|---|---:|---:|---:|
| USD 0 | 959 | 2.55% | 15.43% |
| >0–500 | 484 | 1.29% | 40.91% |
| >500–1,000 | 350 | 0.93% | 46.57% |
| >1,000–5,000 | 2,328 | 6.19% | 42.87% |
| >5,000–10,000 | 3,372 | 8.97% | 32.00% |
| >10,000 | 30,093 | 80.06% | 19.87% |

These are descriptive IBM training-data statistics, not validated Kenyan probabilities. KES 50,000 converts to **USD 387.60**, falls at the **3.67th percentile**, and belongs to the >0–500 band with 484 original training opportunities. It is in the low tail and less common than larger opportunities, but is represented rather than unsupported.

| KES amount | USD amount | Primary probability: verified KES 0 history | Primary probability: verified KES 800,000 history |
|---:|---:|---:|---:|
| 25,000 | 193.80 | 0.53430 | 0.90459 |
| 50,000 | 387.60 | 0.55222 | 0.90618 |
| 100,000 | 775.19 | 0.52722 | 0.91434 |
| 250,000 | 1,937.98 | 0.38613 | 0.91997 |
| 500,000 | 3,875.97 | 0.50584 | 0.92509 |
| 1,000,000 | 7,751.94 | 0.37199 | 0.92706 |

For the same KES 50,000 amount, route and product with genuinely unavailable history, the limited-history fallback returns **0.59595**. It is not comparable as though it were the same information state as a primary-model code-0 account; unknown history is never encoded as zero.

The frozen model’s response is non-linear: higher amount does not consistently increase or decrease probability. Low deal value therefore does not automatically mean low win probability. A technically compatible value and a non-empty IBM input band still do not establish Kenyan-market calibration, product/route equivalence, or external predictive validity.
