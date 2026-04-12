import test from "node:test";
import assert from "node:assert/strict";

import { isActiveInviteUniqueConstraintError } from "@/lib/disc-invites";

test("isActiveInviteUniqueConstraintError detects non-prisma errors as false", () => {
  assert.equal(isActiveInviteUniqueConstraintError(new Error("x")), false);
});
