"""Build a reproducible IBM validation replay using the frozen primary artifact."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path

import joblib
import nbformat
import numpy as np

root = Path(__file__).resolve().parents[3]
notebook_path = root / "notebooks/08_automotive_domain_analysis.ipynb"
artifact = root / "models/automotive_v1/automotive_5_primary.joblib"
metadata_path = artifact.parent / "metadata.json"
protected = [notebook_path, *artifact.parent.glob("*")]
before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in protected if p.is_file()}
notebook = nbformat.read(notebook_path, as_version=4)
namespace = {}

# Reuse the authoritative preparation and membership without running training or test cells.
os.chdir(root)
with contextlib.redirect_stdout(io.StringIO()):
    for cell in [6, 13, 20, 24, 26]:
        exec(compile(notebook.cells[cell - 1].source, f"Notebook08:cell{cell}", "exec"), namespace)
        namespace["display"] = lambda *args, **kwargs: None
validation = namespace["automotive_partitions"]["Validation"]
assert len(validation) == 15025 and validation["Opportunity Number"].is_unique
sample = validation.sample(n=1000, random_state=42)
metadata = json.loads(metadata_path.read_text())
columns = metadata["primary_features"]
model = joblib.load(artifact)
probabilities = model.predict_proba(sample[columns])[:, 1]
assert np.isfinite(probabilities).all() and ((probabilities >= 0) & (probabilities <= 1)).all()

records = [
    {
        "opportunityNumber": int(row["Opportunity Number"]),
        "features": {column: row[column].item() if hasattr(row[column], "item") else row[column] for column in columns},
        "outcome": "WON" if row["target"] == 1 else "LOST",
        "wonProbability": float(probability),
    }
    for (_, row), probability in zip(sample.iterrows(), probabilities)
]
assert len({row["opportunityNumber"] for row in records}) == 1000
payload = {
    "modelVersion": metadata["model_version"],
    "modelSha256": before[artifact],
    "datasetSha256": hashlib.sha256((root / "datasets/IBM-sales-opportunity.csv").read_bytes()).hexdigest(),
    "source": "IBM validation replay · 1,000 sampled opportunities · frozen primary model",
    "partition": "Validation",
    "sampling": "Simple random sample, seed 42, selected without using outcomes or prediction values",
    "explanation": "Probabilities were computed by the saved Automotive v1 model from the five original inputs. Won/Lost labels are copied from the IBM dataset.",
    "warning": "Dataset replay for demonstration, not new sales or independent validation. IBM provides no opportunity dates or client identities; no CRM history was invented.",
    "records": records,
}
output = root / "apps/crm-api/data/ibm-reliability-demo.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(payload, indent=2) + "\n")
assert all(hashlib.sha256(path.read_bytes()).hexdigest() == digest for path, digest in before.items())
high = [row for row in records if row["wonProbability"] >= 0.7]
print(f"Seeded {len(records)} IBM opportunities with actual model predictions into {output.relative_to(root)}")
print(f">=70% cohort: {sum(row['outcome'] == 'WON' for row in high)} Won / {len(high)} resolved")
for band in range(10):
    rows = [row for row in records if min(9, int(row["wonProbability"] * 10)) == band]
    print(f"{band * 10:2}-{(band + 1) * 10:3}%: {len(rows)} records, {sum(row['outcome'] == 'WON' for row in rows)} Won")
