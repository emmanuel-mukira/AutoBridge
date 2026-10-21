export type DisplayCurrency = "KES" | "USD";

export const ILLUSTRATIVE_KES_PER_USD = 129;

export function convertForDisplay(
  amount: number,
  originalCurrency: DisplayCurrency,
  displayCurrency: DisplayCurrency,
  kesPerUsd = ILLUSTRATIVE_KES_PER_USD,
) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount must be a non-negative finite number");
  if (!Number.isFinite(kesPerUsd) || kesPerUsd <= 0) throw new Error("KES per USD rate must be positive");
  if (originalCurrency === displayCurrency) return amount;
  return originalCurrency === "KES" ? amount / kesPerUsd : amount * kesPerUsd;
}

export function formatMoney(
  amount: number,
  originalCurrency: DisplayCurrency,
  displayCurrency: DisplayCurrency,
  kesPerUsd = ILLUSTRATIVE_KES_PER_USD,
) {
  const displayedAmount = convertForDisplay(amount, originalCurrency, displayCurrency, kesPerUsd);
  return new Intl.NumberFormat(displayCurrency === "KES" ? "en-KE" : "en-US", {
    style: "currency",
    currency: displayCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(displayedAmount);
}
