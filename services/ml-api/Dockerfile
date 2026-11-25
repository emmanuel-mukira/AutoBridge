FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/services/ml-api
COPY services/ml-api/requirements.runtime.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --timeout 120 --retries 5 -r requirements.runtime.txt
RUN useradd --system --create-home --uid 10001 autobridge
COPY --chown=autobridge:autobridge services/ml-api/app ./app
COPY --chown=autobridge:autobridge models/automotive_v1 /app/models/automotive_v1
USER autobridge
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
