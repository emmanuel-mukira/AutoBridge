## Starting the ml service : 

cd services/ml-api
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

## Starting psql
docker compose up -d postgres
docker compose ps
