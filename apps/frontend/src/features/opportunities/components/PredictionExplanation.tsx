import type { OpportunityPrediction, PredictionContribution } from "../services/opportunitiesApi";
import { formatMoney } from "@/lib/currency";

const inputLabels: Record<string, string> = {
  "Opportunity Amount USD": "Opportunity amount",
  "Revenue From Client Past Two Years": "Previous two-year revenue",
  "Route To Market": "Route to market",
  "Supplies Group": "Product group",
  "Supplies Subgroup": "Product subgroup",
};

const revenueBandDescriptions: Record<string, string> = {
  "0": "Verified no qualifying revenue",
  "1": "USD 1 to under USD 50,000",
  "2": "USD 50,000 to under USD 400,000",
  "3": "USD 400,000 to under USD 1,500,000",
  "4": "USD 1,500,000 or more",
};

function displayInput(name: string, value: unknown) {
  if (name === "Opportunity Amount USD") return formatMoney(Number(value), "USD", "USD");
  if (name === "Revenue From Client Past Two Years") return `Band ${value}`;
  return String(value);
}

function inputDescription(name: string, value: unknown) {
  if (name === "Opportunity Amount USD") return "Model-ready USD value saved at scoring time";
  if (name === "Revenue From Client Past Two Years") return revenueBandDescriptions[String(value)];
  return undefined;
}

function featureValue(item: PredictionContribution) {
  if (item.feature_unit === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(item.feature_value));
  if (item.feature_unit === "IBM revenue band") return `Band ${item.feature_value}`;
  return String(item.feature_value);
}

function contributionLabel(contribution: number) {
  const points = contribution * 100;
  const precision = Math.abs(points) >= 0.1 ? 1 : Math.abs(points) >= 0.01 ? 2 : 3;
  return `${points > 0 ? "+" : ""}${points.toFixed(precision)} pp`;
}

function Factors({ title, items, positive, maximum }: { title: string; items: PredictionContribution[]; positive: boolean; maximum: number }) {
  return <div className="space-y-2">
    <h4 className="text-sm font-medium">{title}</h4>
    {items.length === 0 && <p className="text-xs text-muted-foreground">No {positive ? "positive" : "negative"} contribution for this score.</p>}
    {items.map((item) => <div key={item.feature} className="space-y-1" title={`${item.feature}: ${featureValue(item)}; ${contributionLabel(item.contribution)}`}>
      <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate">{item.display_name}</span><span className={positive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>{contributionLabel(item.contribution)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${maximum ? Math.abs(item.contribution) / maximum * 100 : 0}%`, minWidth: item.contribution === 0 ? undefined : "2px" }} /></div>
      <p className="text-[11px] text-muted-foreground">{featureValue(item)}</p>
    </div>)}
  </div>;
}

function modelInputs(prediction: OpportunityPrediction) {
  const value = prediction.inputSnapshot.modelReadyFeatures;
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).sort(([left], [right]) => Object.keys(inputLabels).indexOf(left) - Object.keys(inputLabels).indexOf(right));
}

export function PredictionExplanation({ prediction }: { prediction: OpportunityPrediction }) {
  const explanation = prediction.explanation;
  const inputs = modelInputs(prediction);
  const maximum = explanation?.status === "available" ? Math.max(...explanation.contributions.map((item) => Math.abs(item.contribution)), 0) : 0;
  return <div className="space-y-4">
    <div><h4 className="mb-2 text-sm font-medium">Model inputs</h4><dl className="grid gap-2 text-xs sm:grid-cols-2">{inputs.map(([name, value]) => <div key={name} className="rounded-md bg-muted/60 p-2"><dt className="text-muted-foreground">{inputLabels[name] ?? name}</dt><dd className="mt-1 font-medium">{displayInput(name, value)}</dd>{inputDescription(name, value) && <dd className="mt-1 text-[11px] text-muted-foreground">{inputDescription(name, value)}</dd>}</div>)}</dl><p className="mt-2 text-xs text-muted-foreground">Amounts shown here are the saved model-ready USD inputs and do not follow the page display-currency preference.</p></div>
    {!explanation || explanation.status === "unavailable" ? <p className="text-sm text-muted-foreground">Explanation unavailable for this saved prediction{explanation?.status === "unavailable" ? `: ${explanation.reason}` : "."}</p> : <>
      <p className="text-sm text-muted-foreground">Each factor shows how much that input moved this prediction above or below the model baseline. These associations do not establish causation.</p>
      <div className="grid gap-5 sm:grid-cols-2"><Factors title="Positive factors" items={explanation.top_positive} positive maximum={maximum} /><Factors title="Negative factors" items={explanation.top_negative} positive={false} maximum={maximum} /></div>
      <p className="text-xs text-muted-foreground">Baseline {(explanation.baseline * 100).toFixed(1)}% · Tree SHAP on the Won-probability output · {explanation.explainer.feature_perturbation.replaceAll("_", " ")} · SHAP {explanation.explainer.version}</p>
    </>}
  </div>;
}
