"""Package approved aggregates only; never execute experiments. Run from any directory."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
source_hashes = {}

def source(relative):
    path = root / 'docs/testing' / relative
    raw = path.read_bytes()
    source_hashes[relative] = hashlib.sha256(raw).hexdigest()
    return raw.decode('utf-8-sig')

def rows(name):
    return list(csv.DictReader(source('predictive-evaluation/' + name).splitlines()))

def number(value):
    return float(value) if value else None

metrics = rows('test-confidence-intervals.csv')
algorithms = rows('algorithm-test-comparison.csv')
bins = rows('reliability-bins.csv')
shap = rows('global-shap-importance.csv')
verification = json.loads(source('predictive-evaluation/global-shap-verification.json'))
models = []
for name, inputs in [('Primary RF', 5), ('Fallback RF', 4)]:
    provenance = next(row for row in verification if row['Model'] == name)
    model_metrics = [dict(label=row['Metric'], value=number(row['Point estimate']),
                          lower=number(row['CI lower']), upper=number(row['CI upper']))
                     for row in metrics if row['Model'] == name]
    reliability = [dict(label=('0–10%' if i == 0 else f'{i*10}–{(i+1)*10}%'),
                        count=int(row['N']), meanPrediction=number(row['Mean_prediction']),
                        observedWinRate=number(row['Observed_win_rate']))
                   for i, row in enumerate(r for r in bins if r['Model'] == name)]
    importance = [dict(attribute=row['Business attribute'],
                       percentagePoints=number(row['Mean absolute SHAP (percentage points)']),
                       share=number(row['Share of total mean absolute attribution']))
                  for row in shap if row['Model'] == name]
    assert len(model_metrics) == 3 and sum(row['count'] for row in reliability) == 15030
    assert abs(sum(row['share'] for row in importance) - 1) < 1e-12
    models.append(dict(name=name, inputs=inputs, artifactSha256=provenance['Frozen artifact SHA256'],
                       metrics=model_metrics, reliability=reliability, shap=importance))
optimization = json.loads(source('optimization-evaluation/summary.json'))
tests = json.loads(source('optimization-evaluation/validation-summary.json'))
baselines = [dict(method=row['method'], medianImprovementPercent=row['improvementOverMethodPercent']['median'],
                  strictWins=row['strictWins'], ties=row['ties'],
                  meanGapUsd=row['absoluteGapUsd']['mean'], worstGapUsd=row['absoluteGapUsd']['max'])
             for row in optimization['summaries'] if row['method'] != 'MCKP']
assert all(row['definedPercentageCases'] == 483 and row['zeroDenominatorCases'] == 17
           and row['feasibilityViolations'] == 0 and row['greedyBeatsMckp'] == 0
           for row in optimization['summaries'])
summary = dict(schemaVersion=1, version='2026-11-25.v1', modelVersion='automotive_v1',
    predictive=dict(testCount=15030, bootstrapReplicates=2000, shapSample=500, shapBackground=100,
        models=models,
        algorithms=[dict(name=row['Model'], rocAuc=number(row['ROC-AUC']),
                         averagePrecision=number(row['Average Precision']), brier=number(row['Brier Score']))
                    for row in algorithms if row['Model'] in ['Primary RF', 'Logistic Regression', 'XGBoost']]),
    optimization=dict(scenarios=optimization['config']['scenarios'], feasibleOutputs=sum(row['scenarios'] for row in optimization['summaries']),
        feasibilityViolations=sum(row['feasibilityViolations'] for row in optimization['summaries']),
        optimality=optimization['optimality'], deterministicTests=tests['targetedNamedTests'],
        definedPercentageCases=483, zeroDenominatorCases=17, baselines=baselines,
        runtime=[{key: row[key] for key in ['candidateCount', 'groupCount', 'capacityMinutes', 'repetitions', 'warmups', 'medianMs', 'p95Ms']}
                 for row in optimization['runtime']], runtimeCpu=optimization['environment']['cpu'],
        runtimeNode=optimization['environment']['node']),
    sourceSha256=source_hashes)
output = root / 'apps/crm-api/data/research-evaluation-summary.json'
encoded = json.dumps(summary, indent=2, allow_nan=False) + '\n'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true', help='Verify packaged numbers and source hashes without writing')
args = parser.parse_args()
if args.check:
    assert output.read_text() == encoded, 'Packaged evaluation differs from retained approved aggregates'
else:
    output.write_text(encoded)
print(f'{"Verified" if args.check else "Packaged"} approved aggregates: {len(encoded.encode())} bytes; no records or identifiers')
