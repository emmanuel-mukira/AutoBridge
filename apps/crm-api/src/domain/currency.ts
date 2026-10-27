import { Prisma } from "@prisma/client";

export type SupportedCurrency = "USD" | "KES";

export type ExchangeRate = {
  baseCurrency: "USD";
  quoteCurrency: SupportedCurrency;
  quoteUnitsPerUsd: Prisma.Decimal.Value;
  source: string;
  observedAt: Date;
};

export const ILLUSTRATIVE_USD_KES_RATE: ExchangeRate = {
  baseCurrency: "USD",
  quoteCurrency: "KES",
  quoteUnitsPerUsd: 129,
  source: "AutoBridge illustrative development rate; not a live market rate",
  observedAt: new Date("2026-10-21T00:00:00.000Z"),
};

export class CurrencyConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurrencyConversionError";
  }
}

function decimal(value: Prisma.Decimal.Value, field: string) {
  let parsed: Prisma.Decimal;
  try {
    parsed = new Prisma.Decimal(value);
  } catch {
    throw new CurrencyConversionError(`${field} must be a valid number`);
  }
  if (!parsed.isFinite() || parsed.isNegative()) {
    throw new CurrencyConversionError(`${field} must be a non-negative finite number`);
  }
  return parsed;
}

export function convertMoneyToUsd(input: {
  amount: Prisma.Decimal.Value;
  currency: string;
  rate?: ExchangeRate;
  convertedAt?: Date;
}) {
  const originalCurrency = input.currency.trim().toUpperCase();
  if (originalCurrency !== "USD" && originalCurrency !== "KES") {
    throw new CurrencyConversionError(`Unsupported currency: ${originalCurrency || "missing"}`);
  }

  const originalAmount = decimal(input.amount, "amount");
  const convertedAt = input.convertedAt ?? new Date();
  if (!Number.isFinite(convertedAt.getTime())) {
    throw new CurrencyConversionError("convertedAt must be a valid timestamp");
  }

  if (originalCurrency === "USD") {
    if (input.rate && (!new Prisma.Decimal(input.rate.quoteUnitsPerUsd).equals(1) || input.rate.quoteCurrency !== "USD")) {
      throw new CurrencyConversionError("USD input must not be converted again");
    }
    return {
      originalAmount: originalAmount.toString(),
      originalCurrency,
      modelReadyAmountUsd: originalAmount.toString(),
      quoteUnitsPerUsd: "1",
      rateSource: "USD identity conversion",
      rateObservedAt: convertedAt.toISOString(),
      convertedAt: convertedAt.toISOString(),
    } as const;
  }

  const rate = input.rate;
  if (!rate || rate.baseCurrency !== "USD" || rate.quoteCurrency !== "KES" || !rate.source.trim()) {
    throw new CurrencyConversionError("A documented USD/KES rate is required");
  }
  const quoteUnitsPerUsd = decimal(rate.quoteUnitsPerUsd, "quoteUnitsPerUsd");
  if (quoteUnitsPerUsd.isZero() || !Number.isFinite(rate.observedAt.getTime())) {
    throw new CurrencyConversionError("The exchange rate and its timestamp must be valid");
  }

  return {
    originalAmount: originalAmount.toString(),
    originalCurrency,
    modelReadyAmountUsd: originalAmount.dividedBy(quoteUnitsPerUsd).toString(),
    quoteUnitsPerUsd: quoteUnitsPerUsd.toString(),
    rateSource: rate.source,
    rateObservedAt: rate.observedAt.toISOString(),
    convertedAt: convertedAt.toISOString(),
  } as const;
}

export function deriveIbmRevenueHistoryCode(verifiedRevenueUsd: Prisma.Decimal.Value | null | undefined) {
  if (verifiedRevenueUsd == null) return null;
  const revenue = decimal(verifiedRevenueUsd, "verifiedRevenueUsd");
  if (revenue.isZero()) return 0 as const;
  if (revenue.lessThan(1)) {
    throw new CurrencyConversionError("Positive verified revenue below USD 1 requires review");
  }
  if (revenue.lessThan(50_000)) return 1 as const;
  if (revenue.lessThan(400_000)) return 2 as const;
  if (revenue.lessThan(1_500_000)) return 3 as const;
  return 4 as const;
}
