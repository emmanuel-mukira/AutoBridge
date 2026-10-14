# Automotive Model Decisions

**Status: finalized IBM automotive/RV-labelled case-study model — Automotive 5 Random Forest, raw probabilities, with a conditional limited-history fallback.** Executed evidence is in [Notebook 08](../notebooks/08_automotive_domain_analysis.ipynb). This is not a production-validation claim for an arbitrary automotive supplier.

## Automotive dataset scope

The IBM Sales Win/Loss extract was cleaned using the established rules: duplicate records and conflicting representations of the same opportunity were removed before splitting. The automotive/RV-labelled subset contains **75,158** retained opportunities: **17,103 Won** and **58,055 Loss** (Won prevalence **22.76%**).

The inclusion rule was set from labels, before outcome analysis. It includes `Car Accessories` (Batteries & Accessories, Exterior Accessories, Garage & Car Care, Interior Accessories, Replacement Parts, Towing & Hitches), `Car Electronics` (Car Electronics), `Tires & Wheels` (Tires & Wheels), and `Performance & Non-auto` only for the explicitly named Motorcycle Parts and Shelters & RV subgroups. `Performance Parts` is excluded: its IBM parent is `Performance & Non-auto` and repository material does not establish whether it is automotive, recreational, or another market. `Motorcycle Parts` appears under that same parent hierarchy, so it is included only because its own label is explicit; this is not a claim about a real-world product taxonomy.

The repository has no verified IBM data dictionary, industry statement, dates, or code definitions. Product labels support an IBM label-based subset only. They do not prove the records came from an automotive supplier, that every field was known at prediction time, or that the result transfers to another organization.

## Feature engineering and model experiments

The model predicts the eventual IBM Won/Loss result for one opportunity. `Opportunity Amount USD` is transformed with `log1p`, which compresses a wide non-negative amount range while retaining zero. Categorical fields are one-hot encoded: each category becomes a separate 0/1 input for the estimator. Product group and subgroup are kept together for the selected case-study contract, while recognising that they may be redundant because subgroup determines group in this extract.

All experiments retain the established train/calibration/validation/test membership; records were not reshuffled. Logistic Regression, Random Forest and XGBoost use fixed, visible settings rather than hyperparameter tuning. The validation comparison is below; values are ROC-AUC / Average Precision / Brier, and lower Brier is better.

| Feature specification | Logistic Regression | Random Forest | XGBoost |
|---|---|---|---|
| Lean 3: amount, history, route | 0.72644 / 0.49738 / 0.14852 | 0.82218 / 0.60361 / 0.12925 | 0.81684 / 0.60100 / 0.13069 |
| Automotive 4: Lean 3 + subgroup | 0.72763 / 0.49918 / 0.14798 | 0.81934 / 0.60620 / 0.12960 | 0.81579 / 0.60232 / 0.13076 |
| Automotive 5: Lean 3 + group + subgroup | 0.72758 / 0.49904 / 0.14798 | **0.82083 / 0.60763 / 0.12921** | 0.81676 / 0.60238 / 0.13062 |
| Automotive 7: Automotive 5 + two client-size fields | 0.72665 / 0.49934 / 0.14796 | 0.82067 / 0.60596 / 0.12935 | 0.81622 / 0.60312 / 0.13064 |
| Automotive 8: Automotive 7 + region | 0.72813 / 0.50314 / 0.14774 | 0.82145 / 0.60796 / 0.12911 | 0.81568 / 0.60414 / 0.13077 |

The notebook also permuted original business fields for the leading richer tree model. It is a diagnostic of how much a fitted model relies on a field, not causal evidence: shuffling can create unlikely combinations and correlated fields can share importance.

Excluded prediction fields include IDs, the Won/Loss result, final close details, sales-cycle durations and ratios with future duration in their denominator. These can leak information unavailable when a live opportunity is scored. Region has negligible incremental benefit and IBM regions cannot be assumed to transfer. The revenue- and employee-size fields add negligible information after the selected inputs. Competitor information had weak earlier evidence and uncertain prediction-time availability. These, plus geography and operational information, can still be valuable CRM fields without being model inputs.

## Final selection and validation decisions

The primary model is **Random Forest — Automotive 5** with these five predictors:

1. `Opportunity Amount USD`
2. `Revenue From Client Past Two Years`
3. `Route To Market`
4. `Supplies Group`
5. `Supplies Subgroup`

It was selected deliberately for domain alignment: group and subgroup are central to the proposed automotive opportunity-management workflow, while retaining strong probability quality. It does **not** materially outperform Lean 3. Automotive 5 has slightly higher AP and lower Brier, while Lean 3 has slightly higher ROC-AUC. Automotive 7 and 8 add less-portable client profile/geographic fields for only very small changes. The frozen broader IBM Lean 3 model and a Lean 3 model trained only on the automotive subset also scored almost identically on the same automotive validation records (broader: **0.82159 / 0.60353 / 0.12928**; subset: **0.82218 / 0.60361 / 0.12925**). Restricting training alone did not establish a meaningful improvement.

**Calibration:** raw validation probabilities scored 0.82083 ROC-AUC, 0.60763 AP and 0.12921 Brier. Sigmoid calibration was fitted only on the calibration partition and changed validation Brier to **0.12919**. The 0.00002 reduction did not meet the prespecified worthwhile-improvement rule of 0.0005, so **raw probabilities are retained**. Calibration means checking whether predictions such as 0.70 correspond to roughly 70% wins across many comparable records; it does not guarantee an individual outcome.

The validation F1 threshold is **0.23168** (F1 **0.58081**). A threshold turns a probability into a teaching/reporting label: scores at or above it are labelled predicted Won. Precision is the share of predicted Wins that actually won; recall is the share of actual Wins identified; F1 balances those two. This threshold is **not** the application’s commercial-priority rule. Priority must separately consider probability, value, urgency, information quality and human judgement.

## Final repeated internal evaluation

After finalizing the feature set, algorithm, raw-probability decision, fallback rule and threshold, the frozen primary was evaluated once on the automotive test membership.

| Measure | Frozen Automotive 5 result |
|---|---:|
| ROC-AUC | 0.81441 |
| Average Precision | 0.60221 |
| Brier | 0.13079 |
| Test Won prevalence | 0.22774 |
| Training-prevalence Brier | 0.17588 |
| Precision / Recall / F1 at 0.23168 | 0.48559 / 0.70903 / 0.57642 |
| Minimum / maximum probability | 0.00435 / 0.94710 |

The model improves Brier by **0.04509** versus predicting the training win prevalence for every test opportunity. The threshold confusion matrix is: 9,036 actual losses correctly labelled Loss, 2,571 losses labelled Won, 996 wins labelled Loss, and 2,427 wins labelled Won.

The reliability table is broadly useful, but not perfect. The largest populated gap is in the 0.20–0.30 range: mean prediction 0.2446 versus observed Won rate 0.3086. The 0.80–0.90 range has 383 records and mean prediction 0.8455 versus observed 0.8094. Reliability must be monitored after deployment using later actual outcomes; sparse ranges should not be over-interpreted.

The parent IBM holdout was already inspected in Notebook 07. Therefore this is a **repeated internal IBM-data evaluation**, not a newly blind test and not external validation.

## SHAP explanation

SHAP decomposes a prediction into contributions relative to a reference probability. Additivity was verified in **Won-probability units** for this raw Random Forest: the reference plus contributions reconstructs the displayed model probability.

Across representative validation opportunities, mean absolute SHAP contributions are prior-client revenue **0.10608**, amount **0.09829**, route **0.02898**, subgroup **0.00854**, and group **0.00335**. The local example has reference probability 0.19699 and model probability 0.16078; route adds 0.03769, while previous-client history (-0.05145), amount (-0.01694), subgroup (-0.00544) and group (-0.00007) reduce it. These are learned associations in IBM data, not proof that changing a route, product or history causes a sale outcome.

## Fallback, reliability and CRM integration

The limited-history fallback uses amount, route, product group and product subgroup, with the same Random Forest configuration. On the same validation opportunities, its ROC-AUC/AP/Brier are **0.77858 / 0.49058 / 0.14464**, compared with **0.50000 / 0.22696 / 0.17545** for the training-prevalence baseline and **0.82083 / 0.60763 / 0.12921** for the complete-input primary. It is retained because it materially improves probability quality over the simple baseline, while clearly performing worse than the primary. Its frozen test ROC-AUC/AP/Brier are **0.76995 / 0.48559 / 0.14636**; upper probability ranges are sparse, so its reliability needs extra monitoring.

The application rule is deliberately strict:

- A verified zero means complete, reliable account transaction records cover the required prior period and establish zero qualifying revenue. Use the primary model’s verified zero-history representation only after the IBM `0` code definition is confirmed.
- Unknown or incomplete history means the records cannot establish the prior-period amount. Never replace it with `0`; route to the retained fallback only if amount, route, group and subgroup are valid.
- An early-stage opportunity does not prove that the customer is new, has no previous purchases, or has unknown history.
- Salespeople must not guess revenue-history codes. The CRM derives the representation from verified account transaction records and records the information-quality state.

For eventual inference, the account record must provide verified prior transaction history and its coverage period. The opportunity supplies estimated amount, route, product group and subgroup. Customer size, geography, competitor information, interactions, quotations, value/urgency and human feedback remain useful management information but are not Automotive 5 inputs. A future organization must validate category/route mappings and compatible prediction-time inputs before treating this IBM-trained model as applicable.

## Limitations

IBM source dates, transaction/code semantics and field availability times remain unresolved. The exact meaning of the IBM history codes, including `0`, must be confirmed before integration. The result has no organization-specific or external automotive validation, and the parent IBM test partition was inspected earlier. The model must not be described as production-validated for arbitrary automotive suppliers.
