from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    api_version: Literal["v1"] = "v1"
    model_version: Literal["automotive_v1"]
    variant: Literal["PRIMARY", "LIMITED_HISTORY"]
    features: dict[str, Any]


class PredictionResponse(BaseModel):
    api_version: Literal["v1"] = "v1"
    model_family: Literal["Random Forest"] = "Random Forest"
    model_version: str
    variant: Literal["PRIMARY", "LIMITED_HISTORY"]
    won_probability: float = Field(ge=0, le=1)
    features: dict[str, Any]
    explanation: dict[str, Any]
