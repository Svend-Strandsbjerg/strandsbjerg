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

export type DiscDimensionRank = {
  dimension: DiscDimension;
  score: number;
};

export type DiscProfilePresentation = {
  profileTitle: string;
  profileLabel: string;
  summary: string;
  explanatoryNote: string;
  dominantPair: [DiscDimension, DiscDimension];
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

const DIMENSION_LABELS: Record<DiscDimension, string> = {
  D: "Dominance",
  I: "Influence",
  S: "Steadiness",
  C: "Conscientiousness",
};

const PROFILE_TITLES: Record<string, string> = {
  DI: "Driven Communicator",
  ID: "Persuasive Driver",
  DS: "Decisive Stabilizer",
  SD: "Reliable Driver",
  DC: "Strategic Executor",
  CD: "Structured Driver",
  IS: "Engaging Supporter",
  SI: "Steady Connector",
  IC: "Expressive Analyst",
  CI: "Analytical Influencer",
  SC: "Calm Specialist",
  CS: "Methodical Supporter",
};

export function rankDiscDimensions(dimensionScores: Record<DiscDimension, number | null>): DiscDimensionRank[] {
  return (["D", "I", "S", "C"] as const)
    .map((dimension) => ({
      dimension,
      score: dimensionScores[dimension] ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((a, b) => b.score - a.score);
}

function normalizeRankWithHints(
  viewModel: DiscResultViewModel,
  rankedDimensions: DiscDimensionRank[],
): [DiscDimension, DiscDimension] {
  const primary = viewModel.primaryDimension ?? rankedDimensions[0]?.dimension ?? "D";
  const secondary = viewModel.secondaryDimension ?? rankedDimensions.find((entry) => entry.dimension !== primary)?.dimension ?? "I";
  return [primary, secondary];
}

function formatDominanceBalanceLine(primary: DiscDimension, secondary: DiscDimension, nearTie: boolean) {
  const pair = `${DIMENSION_LABELS[primary]}-${DIMENSION_LABELS[secondary]}`;
  return nearTie ? `Your profile shows a balanced ${pair} blend.` : `Your profile is led by ${pair} tendencies.`;
}

export function buildDiscProfilePresentation(viewModel: DiscResultViewModel): DiscProfilePresentation {
  const ranked = rankDiscDimensions(viewModel.dimensionScores);
  const [primary, secondary] = normalizeRankWithHints(viewModel, ranked);
  const topScore = ranked[0]?.score ?? 0;
  const secondScore = ranked[1]?.score ?? 0;
  const nearTie = Number.isFinite(topScore) && Number.isFinite(secondScore) && Math.abs(topScore - secondScore) <= 0.08;

  const key = `${primary}${secondary}`;
  const profileTitle = PROFILE_TITLES[key] ?? "Adaptive Professional";
  const profileLabel = `${DIMENSION_LABELS[primary]} / ${DIMENSION_LABELS[secondary]}`;

  const styleLine =
    primary === "D"
      ? "You typically move quickly from discussion to action and prefer clear outcomes."
      : primary === "I"
        ? "You tend to create momentum through communication, optimism, and visible engagement."
        : primary === "S"
          ? "You often create trust through calm follow-through, consistency, and support."
          : "You usually work from structure, evidence, and careful quality standards.";

  const secondaryLine =
    secondary === "D"
      ? "Your secondary pattern adds pace and directness when decisions are needed."
      : secondary === "I"
        ? "Your secondary pattern adds warmth, visibility, and stakeholder connection."
        : secondary === "S"
          ? "Your secondary pattern adds patience, reliability, and team stability."
          : "Your secondary pattern adds rigor, precision, and thoughtful risk control.";

  const balanceLine = formatDominanceBalanceLine(primary, secondary, nearTie);
  const summary = `${balanceLine} ${styleLine} ${secondaryLine}`;

  return {
    profileTitle,
    profileLabel,
    summary: viewModel.profileSummary?.trim() || summary,
    explanatoryNote:
      "DISC describes behavioral preferences in collaboration and communication. It is best used as a practical reflection tool rather than a fixed label.",
    dominantPair: [primary, secondary],
  };
}

export function buildDiscProfileSummary(viewModel: DiscResultViewModel) {
  return buildDiscProfilePresentation(viewModel).summary;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function calculateDiscPosition(dimensionScores: Record<DiscDimension, number | null>): DiscPlacement {
  const D = dimensionScores.D ?? 0;
  const I = dimensionScores.I ?? 0;
  const S = dimensionScores.S ?? 0;
  const C = dimensionScores.C ?? 0;
  const total = D + I + S + C;

  const x = total > 0 ? ((I + S) - (D + C)) / total : 0;
  const y = total > 0 ? ((D + I) - (S + C)) / total : 0;
  const clampedX = clamp(x, -1, 1);
  const clampedY = clamp(y, -1, 1);

  const quadrantScores = {
    DI: D + I,
    IS: I + S,
    SC: S + C,
    CD: C + D,
  } as const;
  const quadrant = (Object.entries(quadrantScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "DI") as DiscPlacement["quadrant"];

  return {
    x: clampedX,
    y: clampedY,
    quadrant,
  };
}

export const deriveDiscPlacement = calculateDiscPosition;
