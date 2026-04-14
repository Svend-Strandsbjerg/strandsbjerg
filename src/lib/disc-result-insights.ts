export type DiscDimension = "D" | "I" | "S" | "C";
export type ResponseRecord = Record<string, unknown>;

type CanonicalDiscResult = {
  dimensions: unknown;
  normalizedDimensions: unknown;
  primaryDimension: unknown;
  secondaryDimension: unknown;
  profileSummary: unknown;
  qualityIndicators: Record<string, unknown> | null;
  lifecycleStatus: unknown;
};

export type DiscResultViewModel = {
  canonicalResult: CanonicalDiscResult | null;
  responseCount: number;
  profileSummary: string | null;
  primaryDimension: DiscDimension | null;
  secondaryDimension: DiscDimension | null;
  lifecycleStatus: string | null;
  dimensionScores: Record<DiscDimension, number | null>;
  qualityIndicators: Record<string, unknown>;
};

export type DiscPlacement = {
  x: number;
  y: number;
  quadrant: "DI" | "IS" | "SC" | "CD";
};

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeToDiscDimension(value: unknown): DiscDimension | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === "D" || normalized === "DOMINANCE") return "D";
  if (normalized === "I" || normalized === "INFLUENCE") return "I";
  if (normalized === "S" || normalized === "STEADINESS") return "S";
  if (normalized === "C" || normalized === "CONSCIENTIOUSNESS" || normalized === "COMPLIANCE") return "C";

  return null;
}

function extractEngineResult(rawResponses: unknown): Record<string, unknown> | null {
  const root = toObject(rawResponses);

  if (!root) {
    return null;
  }

  if (Array.isArray(root.responses) && toObject(root.result)) {
    return toObject(root.result);
  }

  return root;
}

function hasCanonicalFields(value: Record<string, unknown> | null) {
  if (!value) {
    return false;
  }

  return [
    "dimensions",
    "normalizedDimensions",
    "primaryDimension",
    "secondaryDimension",
    "profileSummary",
    "qualityIndicators",
    "lifecycleStatus",
  ].some((key) => key in value);
}

export function extractCanonicalResult(rawResponses: unknown): CanonicalDiscResult | null {
  const enginePayload = extractEngineResult(rawResponses);
  if (!enginePayload) {
    return null;
  }

  const nestedResult = toObject(enginePayload.result);
  const nestedData = toObject(enginePayload.data);
  const nestedDataResult = toObject(nestedData?.result);
  const canonicalSource =
    (hasCanonicalFields(nestedResult) ? nestedResult : null) ??
    (hasCanonicalFields(nestedDataResult) ? nestedDataResult : null) ??
    (hasCanonicalFields(nestedData) ? nestedData : null) ??
    (hasCanonicalFields(enginePayload) ? enginePayload : null);

  if (!canonicalSource) {
    return null;
  }

  return {
    dimensions: canonicalSource.dimensions,
    normalizedDimensions: canonicalSource.normalizedDimensions,
    primaryDimension: canonicalSource.primaryDimension,
    secondaryDimension: canonicalSource.secondaryDimension,
    profileSummary: canonicalSource.profileSummary,
    qualityIndicators: toObject(canonicalSource.qualityIndicators),
    lifecycleStatus: canonicalSource.lifecycleStatus,
  };
}

export function normalizeResponseRecords(rawResponses: unknown): ResponseRecord[] {
  if (Array.isArray(rawResponses)) {
    return rawResponses.filter((entry): entry is ResponseRecord => Boolean(entry) && typeof entry === "object");
  }

  if (rawResponses && typeof rawResponses === "object" && Array.isArray((rawResponses as { responses?: unknown }).responses)) {
    return (rawResponses as { responses: unknown[] }).responses.filter(
      (entry): entry is ResponseRecord => Boolean(entry) && typeof entry === "object",
    );
  }

  return [];
}

function extractDimensionScoresFromObject(source: Record<string, unknown> | null): Record<DiscDimension, number | null> {
  const scores: Record<DiscDimension, number | null> = {
    D: null,
    I: null,
    S: null,
    C: null,
  };

  if (!source) {
    return scores;
  }

  for (const dimension of ["D", "I", "S", "C"] as const) {
    scores[dimension] = toNumber(source[dimension] ?? source[dimension.toLowerCase()]);
  }

  return scores;
}

function parseProfileSummary(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseLifecycleStatus(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildDiscResultViewModel(rawResponses: unknown): DiscResultViewModel {
  const canonicalResult = extractCanonicalResult(rawResponses);
  const dimensionScores = extractDimensionScoresFromObject(
    toObject(canonicalResult?.normalizedDimensions) ?? toObject(canonicalResult?.dimensions),
  );

  return {
    canonicalResult,
    responseCount: normalizeResponseRecords(rawResponses).length,
    profileSummary: parseProfileSummary(canonicalResult?.profileSummary),
    primaryDimension: normalizeToDiscDimension(canonicalResult?.primaryDimension),
    secondaryDimension: normalizeToDiscDimension(canonicalResult?.secondaryDimension),
    lifecycleStatus: parseLifecycleStatus(canonicalResult?.lifecycleStatus),
    dimensionScores,
    qualityIndicators: canonicalResult?.qualityIndicators ?? {},
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function deriveDiscPlacement(dimensionScores: Record<DiscDimension, number | null>): DiscPlacement {
  const D = dimensionScores.D ?? 0;
  const I = dimensionScores.I ?? 0;
  const S = dimensionScores.S ?? 0;
  const C = dimensionScores.C ?? 0;
  const total = D + I + S + C;

  const x = total > 0 ? ((D + I) - (S + C)) / total : 0;
  const y = total > 0 ? ((D + C) - (I + S)) / total : 0;
  const clampedX = clamp(x, -1, 1);
  const clampedY = clamp(y, -1, 1);

  const quadrant =
    clampedX >= 0 && clampedY >= 0
      ? "DI"
      : clampedX >= 0 && clampedY < 0
        ? "IS"
        : clampedX < 0 && clampedY < 0
          ? "SC"
          : "CD";

  return {
    x: clampedX,
    y: clampedY,
    quadrant,
  };
}
