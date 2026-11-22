import assert from "node:assert/strict";
import { followUpsOverlap } from "../dist/src/services/followUpSchedule.js";
import { CreateFollowUpSchema } from "../dist/src/schemas/followUp.schemas.js";

const at = (time) => new Date(`2026-11-16T${time}:00.000Z`);
assert.equal(followUpsOverlap(at("09:00"), 30, at("09:15"), 30), true);
assert.equal(followUpsOverlap(at("09:00"), 30, at("09:30"), 30), false);
assert.equal(followUpsOverlap(at("09:30"), 30, at("09:00"), 30), false);
assert.equal(followUpsOverlap(at("23:45"), 30, new Date("2026-11-17T00:00:00.000Z"), 30), true);
const input = { clientId: 1, opportunityId: 1, title: "Call", channel: "CALL", dueAt: at("09:00").toISOString() };
assert.equal(CreateFollowUpSchema.safeParse(input).success, true);
assert.equal(CreateFollowUpSchema.safeParse({ ...input, channel: "FOLLOW_UP" }).success, false);
console.log("PASS: overlapping and adjacent follow-up intervals");
