import { randomBytes } from "node:crypto";

export function ensureDateOptionsMatchEvent(params: {
  selectedOptionCount: number;
  matchingOptionCount: number;
}) {
  if (params.matchingOptionCount !== params.selectedOptionCount) {
    throw new Error("Invalid vote payload: one or more selected date options do not belong to the provided event.");
  }
}

export function createFamilyShareToken() {
  return randomBytes(24).toString("hex");
}

export function normalizeParticipantName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
