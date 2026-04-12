export function ensureDateOptionsMatchEvent(params: {
  selectedOptionCount: number;
  matchingOptionCount: number;
}) {
  if (params.matchingOptionCount !== params.selectedOptionCount) {
    throw new Error("Invalid vote payload: one or more selected date options do not belong to the provided event.");
  }
}
