"""Isolated AutoBridge model experiment; never writes production artifacts."""
from __future__ import annotations

import json
from pathlib import Path
from time import perf_counter

import numpy as np
import pandas as pd
import shap
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import average_precision_score, brier_score_loss, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

try:
    import tensorflow as tf
except ModuleNotFoundError:
    tf = None
try:
    import matplotlib.pyplot as plt
except ModuleNotFoundError:
    plt = None

SEED, THRESHOLD = 42, 0.23168
FEATURES = ["Opportunity Amount USD", "Revenue From Client Past Two Years", "Route To Market", "Supplies Group", "Supplies Subgroup"]
AMOUNT, INTERACTION = FEATURES[0], "Supplies Subgroup x Route To Market"
SUBGROUPS = ["Batteries & Accessories", "Exterior Accessories", "Garage & Car Care", "Interior Accessories", "Replacement Parts", "Towing & Hitches", "Car Electronics", "Tires & Wheels", "Motorcycle Parts", "Shelters & RV"]


class AddInteraction(BaseEstimator, TransformerMixin):
    def fit(self, features, target=None): return self
    def transform(self, features):
        result = features.copy()
        result[INTERACTION] = result["Supplies Subgroup"].astype(str) + " x " + result["Route To Market"].astype(str)
        return result


def partitions(root):
    data = pd.read_csv(root / "datasets/IBM-sales-opportunity.csv", keep_default_na=False, na_values=[""]).drop_duplicates()
    data = data.loc[~data["Opportunity Number"].duplicated(keep=False)].copy()
    data["target"] = data["Opportunity Result"].map({"Won": 1, "Loss": 0})
    assert data["Opportunity Number"].is_unique and data.target.notna().all()
    development, test = train_test_split(data, test_size=.2, stratify=data.target, random_state=SEED)
    fit, validation = train_test_split(development, test_size=.25, stratify=development.target, random_state=SEED + 1)
    training, calibration = train_test_split(fit, test_size=1/6, stratify=fit.target, random_state=SEED + 2)
    result = {name: frame.loc[frame["Supplies Subgroup"].isin(SUBGROUPS)].copy() for name, frame in {"Training": training, "Calibration": calibration, "Validation": validation, "Test": test}.items()}
    assert sum(map(len, result.values())) == 75_158
    return result


def preprocessor(columns):
    categoricals = [column for column in columns if column != AMOUNT]
    return ColumnTransformer([
        ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categoricals),
        ("amount", Pipeline([("log1p", FunctionTransformer(np.log1p, feature_names_out="one-to-one")), ("scale", StandardScaler())]), [AMOUNT]),
    ])


def forest(engineered=False):
    columns = FEATURES + ([INTERACTION] if engineered else [])
    steps = [("interaction", AddInteraction())] if engineered else []
    steps += [("preprocess", preprocessor(columns)), ("model", RandomForestClassifier(n_estimators=200, max_depth=12, min_samples_leaf=30, max_features=.8, n_jobs=2, random_state=SEED))]
    return Pipeline(steps)


def metrics(actual, probabilities):
    return {"ROC-AUC": roc_auc_score(actual, probabilities), "Average Precision": average_precision_score(actual, probabilities), "Brier Score": brier_score_loss(actual, probabilities), "F1": f1_score(actual, probabilities >= THRESHOLD)}


def fit(name, model, training, validation):
    started = perf_counter(); model.fit(training[FEATURES], training.target)
    result = metrics(validation.target, model.predict_proba(validation[FEATURES])[:, 1]); result["Runtime seconds"] = perf_counter() - started
    print(f"{name}: {result}")
    return model, result


def explain(model, sample, background, engineered=False):
    prepared_sample = model.named_steps["interaction"].transform(sample) if engineered else sample
    prepared_background = model.named_steps["interaction"].transform(background) if engineered else background
    prep, rf = model.named_steps["preprocess"], model.named_steps["model"]
    started = perf_counter()
    output = shap.TreeExplainer(rf, data=prep.transform(prepared_background), feature_perturbation="interventional", model_output="probability")(prep.transform(prepared_sample))
    values = output.values[:, :, 1] if output.values.ndim == 3 else output.values
    bases = output.base_values[:, 1] if np.ndim(output.base_values) == 2 else output.base_values
    columns = FEATURES + ([INTERACTION] if engineered else [])
    owners = [next((column for column in columns if name.endswith(column) or name.startswith(f"categorical__{column}_")), AMOUNT) for name in prep.get_feature_names_out()]
    grouped = pd.DataFrame({column: values[:, np.asarray(owners) == column].sum(axis=1) for column in columns})
    assert np.allclose(bases + values.sum(axis=1), model.predict_proba(sample)[:, 1], atol=1e-6)
    return grouped, perf_counter() - started


def neural_network(training, validation, sample):
    if tf is None:
        print("TensorFlow skipped: package is not installed."); return None, None
    tf.keras.utils.set_random_seed(SEED); prep = preprocessor(FEATURES)
    train_x = prep.fit_transform(training[FEATURES]).astype("float32"); val_x = prep.transform(validation[FEATURES]).astype("float32")
    model = tf.keras.Sequential([tf.keras.layers.Input((train_x.shape[1],)), tf.keras.layers.Dense(64, activation="relu"), tf.keras.layers.Dropout(.1), tf.keras.layers.Dense(32, activation="relu"), tf.keras.layers.Dense(1, activation="sigmoid")])
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=[tf.keras.metrics.AUC(name="roc_auc")])
    started = perf_counter(); model.fit(train_x, training.target, validation_data=(val_x, validation.target), epochs=20, batch_size=128, callbacks=[tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True)], verbose=2)
    result = metrics(validation.target, model.predict(val_x, verbose=0).ravel()); result["Runtime seconds"] = perf_counter() - started
    baseline = brier_score_loss(sample.target, model.predict(prep.transform(sample[FEATURES]), verbose=0).ravel()); importance = {}
    for column in FEATURES:
        shuffled = sample[FEATURES].copy(); shuffled[column] = shuffled[column].sample(frac=1, random_state=SEED).to_numpy()
        importance[column] = brier_score_loss(sample.target, model.predict(prep.transform(shuffled), verbose=0).ravel()) - baseline
    return result, pd.Series(importance, name="TensorFlow Brier increase")


def main():
    started = perf_counter(); root = Path(__file__).resolve().parents[1]; output = root / "notebooks/results/regression_pipeline"; output.mkdir(parents=True, exist_ok=True)
    parts = partitions(root); training, validation = parts["Training"], parts["Validation"]
    counts = pd.DataFrame([{"Partition": name, "Opportunities": len(frame), "Won": int(frame.target.sum()), "Loss": int((frame.target == 0).sum())} for name, frame in parts.items()]); print(counts.to_string(index=False)); counts.to_csv(output / "partition_counts.csv", index=False)
    diagnostics = training.groupby(["Supplies Group", "Supplies Subgroup", "Route To Market"], observed=True).target.agg(Opportunities="size", Won="sum", Won_rate="mean").assign(Loss=lambda x: x.Opportunities-x.Won).reset_index()
    diagnostics.to_csv(output / "product_route_diagnostics.csv", index=False); print(diagnostics.sort_values("Opportunities", ascending=False).head(20).to_string(index=False))
    assert training.groupby("Supplies Subgroup")["Supplies Group"].nunique().eq(1).all()
    original, original_result = fit("Original RF", forest(), training, validation)
    for observed, expected in zip([original_result["ROC-AUC"], original_result["Average Precision"], original_result["Brier Score"]], [.82083, .60763, .12921]): assert np.isclose(observed, expected, atol=1e-5)
    engineered, engineered_result = fit("Engineered RF", forest(True), training, validation)
    sample = validation[FEATURES].sample(100, random_state=142); background = training[FEATURES].sample(50, random_state=142)
    original_shap, original_time = explain(original, sample, background); engineered_shap, engineered_time = explain(engineered, sample, background, True)
    original_result["Runtime seconds"] += original_time; engineered_result["Runtime seconds"] += engineered_time
    importance = pd.DataFrame({"Original RF": original_shap.abs().mean(), "Engineered RF": engineered_shap.abs().mean()}).fillna(0); importance["Change"] = importance["Engineered RF"] - importance["Original RF"]
    importance["Original attribution share"] = importance["Original RF"] / importance["Original RF"].sum(); importance["Engineered attribution share"] = importance["Engineered RF"] / importance["Engineered RF"].sum()
    importance.to_csv(output / "shap_comparison.csv"); print(importance.round(5).to_string())
    hierarchy = pd.DataFrame({"Model": ["Original RF", "Engineered RF"], "Combined product hierarchy": [(original_shap["Supplies Group"] + original_shap["Supplies Subgroup"]).abs().mean(), (engineered_shap["Supplies Group"] + engineered_shap["Supplies Subgroup"]).abs().mean()]}); hierarchy.to_csv(output / "combined_product_hierarchy.csv", index=False)
    tf_result, tf_importance = neural_network(training, validation, sample.assign(target=validation.loc[sample.index, "target"])); results = [{"Experiment": "Original RF", **original_result}, {"Experiment": "Engineered RF", **engineered_result}] + ([{"Experiment": "TensorFlow", **tf_result}] if tf_result else [])
    pd.DataFrame(results).to_csv(output / "validation_results.csv", index=False)
    selected_name, selected = min([("Original RF", original), ("Engineered RF", engineered)], key=lambda pair: next(row["Brier Score"] for row in results if row["Experiment"] == pair[0]))
    test_result = metrics(parts["Test"].target, selected.predict_proba(parts["Test"][FEATURES])[:, 1]); print(f"Single test evaluation: {selected_name}: {test_result}")
    plot_status = "skipped: Matplotlib not installed"
    if plt is not None:
        importance[["Original RF", "Engineered RF"]].plot.barh(figsize=(9, 5)); plt.tight_layout(); plt.savefig(output / "rf_shap_comparison.png", dpi=150); plt.close(); plot_status = "rf_shap_comparison.png"
    payload = {"validation_results": results, "selected_candidate": selected_name, "selected_test_result": test_result, "tensorflow_status": "completed" if tf_result else "skipped: not installed", "plot_status": plot_status, "total_runtime_seconds": perf_counter() - started}
    (output / "results.json").write_text(json.dumps(payload, indent=2) + "\n"); print(json.dumps(payload, indent=2)); print(f"Saved: {output}")


if __name__ == "__main__": main()
