import os
import asyncio

import httpx
import pytest

os.environ["ML_API_TOKEN"] = "test-internal-token"

from app import main  # noqa: E402

app = main.app
registry = main.registry


PRIMARY = {
    "Opportunity Amount USD": 250000 / 129,
    "Revenue From Client Past Two Years": 0,
    "Route To Market": "Reseller",
    "Supplies Group": "Car Accessories",
    "Supplies Subgroup": "Replacement Parts",
}
FALLBACK = {
    "Opportunity Amount USD": 50000 / 129,
    "Route To Market": "Reseller",
    "Supplies Group": "Car Accessories",
    "Supplies Subgroup": "Replacement Parts",
}
PRIMARY_EXISTING_CLIENT = {
    "Opportunity Amount USD": 1000000 / 129,
    "Revenue From Client Past Two Years": 1,
    "Route To Market": "Fields Sales",
    "Supplies Group": "Car Accessories",
    "Supplies Subgroup": "Batteries & Accessories",
}


registry.load()


def request(method: str, path: str, **kwargs):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(run())


def post(variant: str, features: dict):
    return request("POST", "/predict", headers={"Authorization": "Bearer test-internal-token"}, json={
        "model_version": "automotive_v1", "variant": variant, "features": features,
    })


def test_health_readiness_and_artifact_contract():
    assert request("GET", "/health").status_code == 200
    assert request("GET", "/ready").json()["variants"] == ["LIMITED_HISTORY", "PRIMARY"]
    assert registry.metadata["primary_features"] == list(PRIMARY)
    assert registry.metadata["fallback_features"] == list(FALLBACK)
    assert list(registry.models["PRIMARY"].feature_names_in_) == list(PRIMARY)
    assert list(registry.models["LIMITED_HISTORY"].feature_names_in_) == list(FALLBACK)
    primary_preprocess = registry.models["PRIMARY"].named_steps["preprocess"]
    categorical_names = primary_preprocess.transformers_[0][2]
    actual_categories = {name: values.tolist() for name, values in zip(categorical_names, primary_preprocess.named_transformers_["categorical"].categories_)}
    assert actual_categories == registry.metadata["primary_encoder_categories"]
    assert primary_preprocess.get_feature_names_out().tolist() == registry.metadata["primary_transformed_feature_order"]


def test_actual_saved_artifact_predictions_are_repeatable():
    primary = post("PRIMARY", PRIMARY)
    assert primary.status_code == 200
    assert primary.json()["won_probability"] == pytest.approx(0.38613, abs=5e-6)
    assert post("PRIMARY", PRIMARY).json()["won_probability"] == primary.json()["won_probability"]
    assert post("PRIMARY", PRIMARY_EXISTING_CLIENT).json()["won_probability"] == pytest.approx(0.85528, abs=5e-6)

    fallback = post("LIMITED_HISTORY", FALLBACK)
    assert fallback.status_code == 200
    assert fallback.json()["won_probability"] == pytest.approx(0.59595, abs=5e-6)


def test_shap_explanations_reconstruct_won_probability_for_both_variants():
    for response, expected_features in ((post("PRIMARY", PRIMARY), list(PRIMARY)), (post("LIMITED_HISTORY", FALLBACK), list(FALLBACK))):
        body = response.json()
        explanation = body["explanation"]
        assert explanation["status"] == "available"
        assert explanation["units"] == "probability"
        assert explanation["explainer"]["class_index"] == 1
        assert explanation["explainer"]["class_label"] == "Won"
        assert [item["feature"] for item in explanation["contributions"]] == expected_features
        assert explanation["reconstructed_value"] == pytest.approx(body["won_probability"], abs=1e-6)
        assert sum(item["contribution"] for item in explanation["contributions"]) + explanation["baseline"] == pytest.approx(body["won_probability"], abs=1e-6)


def test_explanation_failure_does_not_discard_prediction(monkeypatch):
    monkeypatch.setattr(main.explanation_adapter, "explain", lambda *_: (_ for _ in ()).throw(RuntimeError("test failure")))
    response = post("PRIMARY", PRIMARY)
    assert response.status_code == 200
    assert response.json()["won_probability"] == pytest.approx(0.38613, abs=5e-6)
    assert response.json()["explanation"] == {"status": "unavailable", "reason": "Explanation calculation failed"}


def test_rejects_bad_contract_categories_and_credentials():
    assert request("POST", "/predict", json={}).status_code == 401
    assert post("PRIMARY", {key: value for key, value in PRIMARY.items() if key != "Supplies Group"}).status_code == 422
    assert post("PRIMARY", {**PRIMARY, "Revenue From Client Past Two Years": "0"}).status_code == 422
    assert post("PRIMARY", {**PRIMARY, "Route To Market": "Unknown"}).status_code == 422
    assert post("LIMITED_HISTORY", {**FALLBACK, "Supplies Subgroup": "Unsupported"}).status_code == 422
