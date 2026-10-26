import { useUIStore } from "@/app/store";
import { formatMoney, ILLUSTRATIVE_KES_PER_USD, type DisplayCurrency } from "@/lib/currency";
import type { OpportunityPrediction, PredictionContribution } from "../services/opportunitiesApi";

const inputLabels: Record<string, string> = {
  "Opportunity Amount USD": "Opportunity amount",
  "Revenue From Client Past Two Years": "Previous two-year revenue",
  "Route To Market": "Route to market",
  "Supplies Group": "Product group",
  "Supplies Subgroup": "Product subgroup",
};

function savedKesRate(prediction: OpportunityPrediction) {
  const snapshot = prediction.conversionSnapshot;
  const rate = Number(snapshot.quoteUnitsPerUsd);
  return snapshot.originalCurrency === "KES" && Number.isFinite(rate) && rate > 0
    ? rate
    : ILLUSTRATIVE_KES_PER_USD;
}

function revenueDescription(value: unknown, currency: DisplayCurrency, kesPerUsd: number) {
  const bands: Record<string, string> = {
    "0": "No qualifying sales in the previous two years",
    "1": `${formatMoney(1, "USD", currency, kesPerUsd)} to under ${formatMoney(50_000, "USD", currency, kesPerUsd)}`,
    "2": `${formatMoney(50_000, "USD", currency, kesPerUsd)} to under ${formatMoney(400_000, "USD", currency, kesPerUsd)}`,
    "3": `${formatMoney(400_000, "USD", currency, kesPerUsd)} to under ${formatMoney(1_500_000, "USD", currency, kesPerUsd)}`,
    "4": `${formatMoney(1_500_000, "USD", currency, kesPerUsd)} or more`,
  };
  return bands[String(value)] ?? "Saved revenue category unavailable";
}

function featureValue(item: PredictionContribution, currency: DisplayCurrency, kesPerUsd: number) {
  if (item.feature_unit === "USD") return formatMoney(Number(item.feature_value), "USD", currency, kesPerUsd);
  if (item.feature_unit === "IBM revenue band") return revenueDescription(item.feature_value, currency, kesPerUsd);
  return String(item.feature_value);
}

function displayInput(name: string, value: unknown, currency: DisplayCurrency, kesPerUsd: number) {
  if (name === "Opportunity Amount USD") return formatMoney(Number(value), "USD", currency, kesPerUsd);
  if (name === "Revenue From Client Past Two Years") return revenueDescription(value, currency, kesPerUsd);
  return String(value);
}

function contributionLabel(contribution: number) {
  const points = Math.abs(contribution * 100);
  const precision = points >= 0.1 ? 1 : points >= 0.01 ? 2 : 3;
  return `${contribution >= 0 ? "Increased" : "Decreased"} by ${points.toFixed(precision)} percentage points`;
}

function modelInputs(prediction: OpportunityPrediction) {
  const value = prediction.inputSnapshot.modelReadyFeatures;
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).sort(([left], [right]) => Object.keys(inputLabels).indexOf(left) - Object.keys(inputLabels).indexOf(right));
}

export function PredictionExplanation({ prediction }: { prediction: OpportunityPrediction }) {
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const explanation = prediction.explanation;
  const inputs = modelInputs(prediction);
  const kesPerUsd = savedKesRate(prediction);
  const topFactors = explanation?.status === "available"
    ? explanation.top_factors ?? [...explanation.contributions].sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution)).slice(0, 3)
    : [];
  const maximum = Math.max(...topFactors.map((item) => Math.abs(item.contribution)), 0);

  return <div className="space-y-5">
    <section aria-labelledby={`prediction-inputs-${prediction.id}`}>
      <h4 id={`prediction-inputs-${prediction.id}`} className="mb-2 text-sm font-medium">Factors used for this prediction</h4>
      {inputs.length > 0 ? <dl className="grid gap-2 text-xs sm:grid-cols-2">{inputs.map(([name, value]) => <div key={name} className="rounded-md bg-muted/60 p-2"><dt className="text-muted-foreground">{inputLabels[name] ?? name}</dt><dd className="mt-1 font-medium">{displayInput(name, value, displayCurrency, kesPerUsd)}</dd></div>)}</dl> : <p className="text-sm text-muted-foreground">Saved factor details are not available for this older prediction.</p>}
      {displayCurrency === "KES" && inputs.some(([name]) => name === "Opportunity Amount USD") && <p className="mt-2 text-xs text-muted-foreground">Displayed in KES using the saved conversion rate where available. The original USD prediction input remains unchanged.</p>}
    </section>
    {!explanation || explanation.status === "unavailable" ? <p className="text-sm text-muted-foreground">An explanation was not recorded for this prediction.</p> : <section className="space-y-3" aria-labelledby={`prediction-factors-${prediction.id}`}>
      <div><h4 id={`prediction-factors-${prediction.id}`} className="text-sm font-medium">Top factors</h4><p className="text-xs text-muted-foreground">The three strongest model associations are shown; other factors also contributed. These are not causal effects.</p></div>
      <div className="space-y-3">{topFactors.map((item) => {
        const positive = item.contribution >= 0;
        return <div key={item.feature} className="space-y-1 rounded-md border p-3">
          <div className="flex flex-col justify-between gap-1 text-sm sm:flex-row sm:items-center"><span className="font-medium">{item.display_name}</span><span className={positive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>{contributionLabel(item.contribution)}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${maximum ? Math.abs(item.contribution) / maximum * 100 : 0}%`, minWidth: item.contribution === 0 ? undefined : "2px" }} /></div>
          <p className="text-xs text-muted-foreground">{featureValue(item, displayCurrency, kesPerUsd)}</p>
        </div>;
      })}</div>
    </section>}
  </div>;
}
