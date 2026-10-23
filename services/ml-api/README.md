# AutoBridge ML API

This internal FastAPI service loads the frozen `automotive_v1` Random Forest pipelines once at startup. Express is the authorized scoring orchestrator and calls `/predict` with a shared internal bearer token.

## Local setup

From the repository root:

```bash
python3 -m venv services/ml-api/.venv
services/ml-api/.venv/bin/pip install -r services/ml-api/requirements.txt
```

Set `ML_API_TOKEN`, `ML_API_URL` and `ML_API_TIMEOUT_MS` in the ignored `apps/crm-api/.env`. Start the local service with that same environment so Express and FastAPI use the same private token:

```bash
cd services/ml-api
set -a
. ../../apps/crm-api/.env
set +a
MODEL_ARTIFACT_DIR='../../models/automotive_v1' \
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Use `ML_API_URL=http://127.0.0.1:8000` for local development. Restart both services after changing `.env`; running processes do not reload environment variables. Start PostgreSQL with `docker compose up -d postgres`; start Express and React with their existing `npm run dev` commands.

## Contract

- `GET /health`: process health.
- `GET /ready`: loaded artifact version and variants; returns 503 when artifacts are unavailable.
- `POST /predict`: bearer-authenticated inference using API `v1` and model `automotive_v1`.

`PRIMARY` accepts exactly amount USD, integer revenue band 0–4, route, product group and subgroup. `LIMITED_HISTORY` accepts exactly the same contract without revenue. Categories and feature names come from `models/automotive_v1/metadata.json`; unsupported or extra values return 422. The response contains the raw Won probability, selected variant, exact model-ready feature snapshot and a genuine local SHAP explanation.

The explanation adapter caches one `TreeExplainer` per loaded model and explains class index 1 (`Won`). It aggregates transformed one-hot columns back to their original business feature and verifies that the baseline plus signed contributions reconstructs `predict_proba()` within `1e-6`. Because the frozen export does not contain the notebook's sampled training background, runtime explanations use the forest's stored tree-path distribution. The response identifies this as `tree_path_dependent`; SHAP values describe model associations and do not establish causation. If explanation calculation fails, inference still succeeds with an explicit `unavailable` explanation and no fabricated factors.

Run tests with:

```bash
cd services/ml-api
PYTHONPATH=. .venv/bin/pytest -q
```

These tests demonstrate artifact consistency, primary/fallback SHAP additivity and service behavior. They do not provide new predictive evaluation or Kenyan-market validation.
