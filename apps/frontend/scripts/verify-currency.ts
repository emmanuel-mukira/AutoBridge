import assert from "node:assert/strict";
import { convertForDisplay, formatMoney } from "../src/lib/currency.ts";

const storedRecord = Object.freeze({ estimatedAmount: 129_000, currency: "KES" as const, wonProbability: 0.38613 });
const usdDisplay = convertForDisplay(storedRecord.estimatedAmount, storedRecord.currency, "USD");
const kesDisplay = convertForDisplay(1_000, "USD", "KES");

assert.equal(usdDisplay, 1_000);
assert.equal(kesDisplay, 129_000);
assert.equal(storedRecord.estimatedAmount, 129_000);
assert.equal(storedRecord.currency, "KES");
assert.equal(storedRecord.wonProbability, 0.38613);
assert.match(formatMoney(1_000, "USD", "KES"), /129,000\.00/);
assert.throws(() => convertForDisplay(1, "KES", "USD", 0));

console.log("PASS: display conversion, formatting, and immutable source values/probability");
