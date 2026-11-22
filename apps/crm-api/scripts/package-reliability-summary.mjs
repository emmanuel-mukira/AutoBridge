import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { probabilityBandReliability } from "../dist/src/domain/predictionReliability.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = resolve(root, "apps/crm-api/data/ibm-reliability-demo.json");
const output = resolve(root, "apps/crm-api/data/ibm-reliability-summary.json");
const artifact = resolve(
  root,
  "models/automotive_v1/automotive_5_primary.joblib",
);
const metadata = JSON.parse(
  await readFile(resolve(root, "models/automotive_v1/metadata.json"), "utf8"),
);
const sourceBytes = await readFile(source);
const replay = JSON.parse(sourceBytes.toString("utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

assert.equal(replay.modelVersion, metadata.model_version);
assert.equal(
  replay.modelSha256,
  sha256(await readFile(artifact)),
  "Replay does not match the frozen primary model",
);
assert.match(replay.datasetSha256, /^[a-f0-9]{64}$/);
assert.equal(replay.records.length, 1000);
assert.equal(
  new Set(replay.records.map((row) => row.opportunityNumber)).size,
  1000,
);
const featureNames = [...metadata.primary_features].sort();
for (const row of replay.records) {
  assert.deepEqual(Object.keys(row.features).sort(), featureNames);
  assert.ok(["WON", "LOST"].includes(row.outcome));
  assert.ok(
    Number.isFinite(row.wonProbability) &&
      row.wonProbability >= 0 &&
      row.wonProbability <= 1,
  );
}

const summary = {
  modelVersion: replay.modelVersion,
  modelSha256: replay.modelSha256,
  datasetSha256: replay.datasetSha256,
  sourceReplaySha256: sha256(sourceBytes),
  source: replay.source,
  partition: replay.partition,
  sampling: replay.sampling,
  explanation: replay.explanation,
  warning: replay.warning,
  reliability: probabilityBandReliability(
    replay.records.map((row) => ({
      probability: row.wonProbability,
      won: row.outcome === "WON",
    })),
  ),
};
const contents = `${JSON.stringify(summary, null, 2)}\n`;
if (process.argv[2] === "--check") {
  assert.equal(
    await readFile(output, "utf8"),
    contents,
    "Packaged summary differs from the verified replay",
  );
  console.log(
    "PASS: packaged reliability summary matches the frozen-model replay",
  );
} else if (process.argv.length === 2) {
  await writeFile(output, contents);
  console.log(
    "Packaged aggregate reliability summary from the frozen-model replay",
  );
} else {
  throw new Error(
    "Usage: node scripts/package-reliability-summary.mjs [--check]",
  );
}
