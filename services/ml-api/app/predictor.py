from typing import Any, Protocol

import pandas as pd

from .registry import ModelRegistry


class ExplanationAdapter(Protocol):
    def explain(self, variant: str, features: dict[str, Any]) -> dict[str, Any] | None: ...


ROUTES = {"Fields Sales", "Other", "Reseller", "Telecoverage", "Telesales"}


class PredictionAdapter:
    def __init__(self, registry: ModelRegistry):
        self.registry = registry

    def _feature_names(self, variant: str) -> list[str]:
        key = "primary_features" if variant == "PRIMARY" else "fallback_features"
        return self.registry.metadata[key]

    def validate_features(self, variant: str, features: dict[str, Any]) -> dict[str, Any]:
        expected = self._feature_names(variant)
        if set(features) != set(expected):
            missing = [name for name in expected if name not in features]
            extra = [name for name in features if name not in expected]
            raise ValueError(f"Feature contract mismatch; missing={missing}, extra={extra}")

        amount = features["Opportunity Amount USD"]
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < 0:
            raise ValueError("Opportunity Amount USD must be a non-negative number")
        if features["Route To Market"] not in ROUTES:
            raise ValueError("Unsupported Route To Market category")

        categories_key = "primary_encoder_categories" if variant == "PRIMARY" else "fallback_encoder_categories"
        categories = self.registry.metadata[categories_key]
        for name in ("Supplies Group", "Supplies Subgroup"):
            if features[name] not in categories[name]:
                raise ValueError(f"Unsupported {name} category")
        if variant == "PRIMARY":
            history = features["Revenue From Client Past Two Years"]
            if isinstance(history, bool) or not isinstance(history, int) or history not in categories["Revenue From Client Past Two Years"]:
                raise ValueError("Revenue From Client Past Two Years must be an integer from 0 to 4")
        return {name: features[name] for name in expected}

    def predict(self, variant: str, features: dict[str, Any]) -> tuple[float, dict[str, Any]]:
        ordered = self.validate_features(variant, features)
        probability = float(self.registry.models[variant].predict_proba(pd.DataFrame([ordered], columns=list(ordered)))[0, 1])
        if not 0 <= probability <= 1:
            raise RuntimeError("Model returned an invalid probability")
        return probability, ordered
