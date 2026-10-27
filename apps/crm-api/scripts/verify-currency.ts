import assert from "node:assert/strict";
import {
  convertMoneyToUsd,
  CurrencyConversionError,
  deriveIbmRevenueHistoryCode,
  ILLUSTRATIVE_USD_KES_RATE,
} from "../src/domain/currency.ts";

const convertedAt = new Date("2026-10-21T12:00:00.000Z");
const usd = convertMoneyToUsd({ amount: "1000", currency: "USD", convertedAt });
const kes = convertMoneyToUsd({ amount: "129000", currency: "KES", rate: ILLUSTRATIVE_USD_KES_RATE, convertedAt });

assert.equal(usd.modelReadyAmountUsd, "1000");
assert.equal(kes.modelReadyAmountUsd, usd.modelReadyAmountUsd);
assert.equal(kes.originalAmount, "129000");
assert.equal(kes.originalCurrency, "KES");
assert.equal(deriveIbmRevenueHistoryCode(null), null);
assert.equal(deriveIbmRevenueHistoryCode("0"), 0);
assert.equal(deriveIbmRevenueHistoryCode("49999.99"), 1);
assert.equal(deriveIbmRevenueHistoryCode("50000"), 2);
assert.equal(deriveIbmRevenueHistoryCode("400000"), 3);
assert.equal(deriveIbmRevenueHistoryCode("1500000"), 4);
assert.throws(() => deriveIbmRevenueHistoryCode("0.5"), CurrencyConversionError);
assert.throws(() => convertMoneyToUsd({ amount: "1", currency: "EUR" }), CurrencyConversionError);
assert.throws(() => convertMoneyToUsd({ amount: "1", currency: "KES" }), CurrencyConversionError);
assert.throws(
  () => convertMoneyToUsd({ amount: "1", currency: "KES", rate: { ...ILLUSTRATIVE_USD_KES_RATE, quoteUnitsPerUsd: 0 } }),
  CurrencyConversionError,
);

console.log("PASS: exact USD conversion, history bands, unknown history, and invalid inputs");
