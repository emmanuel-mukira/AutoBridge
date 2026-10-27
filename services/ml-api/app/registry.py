import json
from pathlib import Path
from typing import Any

import joblib


class ModelRegistry:
    def __init__(self, artifact_dir: Path):
        self.artifact_dir = artifact_dir
        self.metadata: dict[str, Any] = {}
        self.models: dict[str, Any] = {}
        self.load_failed = False

    def load(self) -> None:
        try:
            metadata = json.loads((self.artifact_dir / "metadata.json").read_text())
            if metadata.get("model_version") != "automotive_v1":
                raise RuntimeError("Unsupported model metadata version")
            self.metadata = metadata
            self.models = {
                "PRIMARY": joblib.load(self.artifact_dir / "automotive_5_primary.joblib"),
                "LIMITED_HISTORY": joblib.load(self.artifact_dir / "automotive_limited_history_fallback.joblib"),
            }
            self.load_failed = False
        except Exception:
            self.metadata = {}
            self.models = {}
            self.load_failed = True

    @property
    def ready(self) -> bool:
        return bool(self.metadata) and set(self.models) == {"PRIMARY", "LIMITED_HISTORY"}
