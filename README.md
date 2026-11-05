# AutoBridge

AutoBridge is an automotive sales opportunity management and decision-support application. It brings client and opportunity records, quotations, sales activity, reporting, and win-probability estimates into one workflow. Predictions support human judgment; they do not decide whether an opportunity is won or how it must be prioritized.

## What the application includes

- **Sales workflow:** clients and contacts, assigned opportunity ownership, pipeline stages and outcomes, product catalogue, versioned quotations, interactions, and follow-ups.
- **Reporting:** an analytics dashboard for pipeline and completed sales, plus a decision-support dashboard that presents prediction coverage and indicative commercial prioritization.
- **Prediction review:** saved win probabilities, the inputs and explanations used for each prediction, prediction history, and separate human reviews.
- **Access control:** Sales Representatives work with records available to their role; administrators manage user accounts and assignments. The API enforces authorization rather than relying on the interface alone.

Commercial priority, model probability, human review, and the final sales outcome are distinct. The primary model uses verified prior-client revenue; when that history is genuinely unavailable, the separately evaluated limited-history fallback can be used.

## Repository guide

| Location | Purpose |
|---|---|
| [`apps/frontend`](apps/frontend) | React and Vite user interface |
| [`apps/crm-api`](apps/crm-api) | Express API, Prisma schema, migrations, and development seed |
| [`services/ml-api`](services/ml-api) | Internal FastAPI inference service |
| [`models/automotive_v1`](models/automotive_v1) | Frozen primary and fallback model artifacts and metadata |
| [`notebooks/08_automotive_domain_analysis.ipynb`](notebooks/08_automotive_domain_analysis.ipynb) | Authoritative model-development and evaluation notebook |

PostgreSQL runs locally through [Docker Compose](docker-compose.yml). The frontend calls the Express API, which owns application rules and saved records; Express calls the internal ML service for scoring.

## Run locally

You need Docker Compose, Node.js/npm, and Python 3 with a virtual environment. Create missing local configuration files from the sanitized templates; keep any existing `.env` files. Set your own database password, session secret, administrator seed credentials, and a matching `ML_API_TOKEN` in the API and ML-service environments. Do not commit populated `.env` files.

```bash
cp -n .env.example .env
cp -n apps/crm-api/.env.example apps/crm-api/.env
cp -n services/ml-api/.env.example services/ml-api/.env
docker compose up -d postgres
```

From `apps/crm-api`, install dependencies, apply the existing migrations, generate Prisma Client, and start the API:

```bash
cd apps/crm-api
npm ci
npx prisma migrate deploy
npx prisma generate
npm run dev
```

For a **local development database only**, `npm run seed:dev` creates the configured administrator and sample records after migration. It requires the `ADMIN_*` values in `apps/crm-api/.env` and does not belong in production setup.

Start the internal model service and frontend in separate terminals:

```bash
cd services/ml-api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd apps/frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Check `http://127.0.0.1:3000/health` for the API and `http://127.0.0.1:8000/ready` for the loaded model service. The frontend's local Vite server proxies `/api` to Express. See the [ML service README](services/ml-api/README.md) for its inference contract and tests.

## Model and project status

Automotive v1 is a frozen Random Forest model with a five-input primary variant and a four-input limited-history fallback. [Notebook 08](notebooks/08_automotive_domain_analysis.ipynb) records the data preparation, model comparison, calibration, internal evaluation, and explanations; [metadata](models/automotive_v1/metadata.json) describes the packaged inputs and parameters. The IBM sales dataset supports an internal case study, **not** evidence that the model is validated for another supplier or market. Dataset provenance, usage rights, feature timing, and organization-specific validation need confirmation before broader use.

This repository supports local development and research. Production deployment, security configuration, and external model validation require separate review.
