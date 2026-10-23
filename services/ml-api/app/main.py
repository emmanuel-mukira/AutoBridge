import os
import secrets
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .contracts import PredictionRequest, PredictionResponse
from .explanations import ShapExplanationAdapter
from .predictor import PredictionAdapter
from .registry import ModelRegistry


def artifact_directory() -> Path:
    configured = os.getenv("MODEL_ARTIFACT_DIR")
    return Path(configured).resolve() if configured else Path(__file__).resolve().parents[3] / "models" / "automotive_v1"


registry = ModelRegistry(artifact_directory())
adapter = PredictionAdapter(registry)
explanation_adapter = ShapExplanationAdapter(registry)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    registry.load()
    yield


app = FastAPI(title="AutoBridge ML API", version="1.0.0", lifespan=lifespan)


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("ML_API_TOKEN")
    if not expected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service authentication is not configured")
    if not authorization or not secrets.compare_digest(authorization, f"Bearer {expected}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid service credentials")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> dict[str, object]:
    if not registry.ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Models are not ready")
    return {"status": "ready", "modelVersion": registry.metadata["model_version"], "variants": sorted(registry.models)}


@app.post("/predict", response_model=PredictionResponse, dependencies=[Depends(require_service_token)])
async def predict(request: PredictionRequest) -> PredictionResponse:
    if not registry.ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Models are not ready")
    try:
        probability, features = adapter.predict(request.variant, request.features)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    try:
        explanation = explanation_adapter.explain(request.variant, features, probability)
    except Exception:
        logger.exception("SHAP explanation failed for %s", request.variant)
        explanation = {"status": "unavailable", "reason": "Explanation calculation failed"}
    return PredictionResponse(
        model_version=registry.metadata["model_version"],
        variant=request.variant,
        won_probability=probability,
        features=features,
        explanation=explanation,
    )
