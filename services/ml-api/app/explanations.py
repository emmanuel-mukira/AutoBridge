from typing import Any

import numpy as np
import pandas as pd
import shap

from .registry import ModelRegistry


DISPLAY_NAMES = {
    "Opportunity Amount USD": "Opportunity amount",
    "Revenue From Client Past Two Years": "Previous two-year revenue band",
    "Route To Market": "Sales route",
    "Supplies Group": "Product group",
    "Supplies Subgroup": "Product subgroup",
}


class ShapExplanationAdapter:
    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self._explainers: dict[str, shap.TreeExplainer] = {}

    def _explainer(self, variant: str) -> shap.TreeExplainer:
        if variant not in self._explainers:
            model = self.registry.models[variant].named_steps["model"]
            self._explainers[variant] = shap.TreeExplainer(
                model,
                feature_perturbation="tree_path_dependent",
                model_output="raw",
            )
        return self._explainers[variant]

    @staticmethod
    def _won_output(explanation: shap.Explanation) -> tuple[np.ndarray, float]:
        values = np.asarray(explanation.values)
        base_values = np.asarray(explanation.base_values)
        won_values = values[0, :, 1] if values.ndim == 3 else values[0]
        won_baseline = float(base_values[0, 1] if base_values.ndim == 2 else base_values[0])
        return won_values, won_baseline

    def explain(self, variant: str, features: dict[str, Any], probability: float) -> dict[str, Any]:
        pipeline = self.registry.models[variant]
        preprocessor = pipeline.named_steps["preprocess"]
        feature_names = list(features)
        frame = pd.DataFrame([features], columns=feature_names)
        transformed = preprocessor.transform(frame)
        explanation = self._explainer(variant)(transformed, check_additivity=True)
        won_values, baseline = self._won_output(explanation)

        owners = []
        for encoded_name in preprocessor.get_feature_names_out():
            owner = next((name for name in feature_names if encoded_name == f"amount__{name}" or encoded_name.startswith(f"categorical__{name}_")), None)
            if owner is None:
                raise RuntimeError(f"Cannot map transformed feature {encoded_name}")
            owners.append(owner)

        contributions = []
        for name in feature_names:
            contribution = float(won_values[np.asarray(owners) == name].sum())
            contributions.append({
                "feature": name,
                "display_name": DISPLAY_NAMES[name],
                "feature_value": features[name],
                "feature_unit": "USD" if name == "Opportunity Amount USD" else ("IBM revenue band" if name == "Revenue From Client Past Two Years" else "category"),
                "contribution": contribution,
            })

        reconstructed = baseline + sum(item["contribution"] for item in contributions)
        error = abs(reconstructed - probability)
        if error > 1e-6:
            raise RuntimeError(f"SHAP additivity check failed: {error}")
        positive = sorted((item for item in contributions if item["contribution"] > 0), key=lambda item: item["contribution"], reverse=True)[:3]
        negative = sorted((item for item in contributions if item["contribution"] < 0), key=lambda item: item["contribution"])[:3]
        return {
            "status": "available",
            "output": "won_probability",
            "units": "probability",
            "baseline": baseline,
            "predicted_value": probability,
            "reconstructed_value": reconstructed,
            "additivity_error": error,
            "contributions": contributions,
            "top_positive": positive,
            "top_negative": negative,
            "explainer": {
                "library": "shap",
                "version": shap.__version__,
                "algorithm": "TreeExplainer",
                "feature_perturbation": "tree_path_dependent",
                "model_output": "raw sklearn RandomForestClassifier class probability",
                "class_index": 1,
                "class_label": "Won",
            },
        }
