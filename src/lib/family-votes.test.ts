import test from "node:test";
import assert from "node:assert/strict";

import { ensureDateOptionsMatchEvent } from "@/lib/family-votes";

test("ensureDateOptionsMatchEvent throws on mismatched ownership counts", () => {
  assert.throws(
    () => ensureDateOptionsMatchEvent({ selectedOptionCount: 2, matchingOptionCount: 1 }),
    /Invalid vote payload/,
  );
});

test("ensureDateOptionsMatchEvent allows full ownership match", () => {
  assert.doesNotThrow(() => ensureDateOptionsMatchEvent({ selectedOptionCount: 2, matchingOptionCount: 2 }));
});
