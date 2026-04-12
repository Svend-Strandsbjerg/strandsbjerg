export type DiscDimension = "D" | "I" | "S" | "C";
export type ResponseRecord = Record<string, unknown>;

export type DimensionInsight = {
  label: string;
  summary: string;
  strengths: string[];
  challenges: string[];
  communication: string;
  workStyle: string;
};

export const DISC_DIMENSION_MAP: Record<DiscDimension, DimensionInsight> = {
  D: {
    label: "Dominance (D)",
    summary: "Direct, results-oriented, and comfortable taking charge in uncertain situations.",
    strengths: ["Moves quickly toward decisions", "Takes ownership under pressure", "Challenges blockers to keep momentum"],
    challenges: ["May appear too blunt in sensitive conversations", "Can overlook consensus when speed is prioritized"],
    communication: "Prefers concise communication focused on outcomes, decisions, and clear priorities.",
    workStyle: "Works best with autonomy, ambitious targets, and room to lead execution.",
  },
  I: {
    label: "Influence (I)",
    summary: "Engaging, persuasive, and energized by collaboration and visible progress.",
    strengths: ["Builds rapport quickly", "Motivates teams with optimism", "Explains ideas in an accessible way"],
    challenges: ["May lose detail when moving fast", "Can overcommit when enthusiasm is high"],
    communication: "Responds well to conversational, positive dialogue with room for idea exchange.",
    workStyle: "Works best in collaborative environments with recognition, people contact, and creative problem-solving.",
  },
  S: {
    label: "Steadiness (S)",
    summary: "Reliable, patient, and focused on stability, support, and long-term consistency.",
    strengths: ["Creates dependable routines", "Supports team cohesion", "Remains calm in changing situations"],
    challenges: ["May delay difficult trade-off decisions", "Can resist abrupt change without context"],
    communication: "Prefers respectful, steady communication with clear expectations and practical next steps.",
    workStyle: "Works best with predictable processes, supportive teams, and clarity around responsibilities.",
  },
  C: {
    label: "Conscientiousness (C)",
    summary: "Analytical, quality-focused, and attentive to structure, standards, and risk.",
    strengths: ["Delivers high-quality output", "Identifies risks early", "Builds robust, well-structured solutions"],
    challenges: ["May overanalyze before acting", "Can become perfectionistic under tight deadlines"],
    communication: "Prefers precise, evidence-based communication with clear criteria and rationale.",
    workStyle: "Works best where quality standards are explicit and careful planning is valued.",
  },
};

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

export function extractDimensionCounts(records: ResponseRecord[]) {
  const counts: Record<DiscDimension, number> = { D: 0, I: 0, S: 0, C: 0 };

  for (const entry of records) {
    const candidates = [entry.dimension, entry.trait, entry.value, entry.discDimension];

    for (const candidate of candidates) {
      const dimension = normalizeToDiscDimension(candidate);
      if (dimension) {
        counts[dimension] += 1;
        break;
      }
    }
  }

  return counts;
}

export function extractInterpretationText(rawResponses: unknown) {
  if (!rawResponses || typeof rawResponses !== "object") {
    return null;
  }

  const candidates = ["interpretation", "summary", "profileSummary", "resultText"] as const;

  for (const key of candidates) {
    const value = (rawResponses as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function buildDiscInsights(rawResponses: unknown) {
  const records = normalizeResponseRecords(rawResponses);
  const dimensionCounts = extractDimensionCounts(records);
  const rankedDimensions = (Object.entries(dimensionCounts) as Array<[DiscDimension, number]>).sort((a, b) => b[1] - a[1]);
  const dominantDimension = rankedDimensions[0]?.[1] > 0 ? rankedDimensions[0][0] : null;
  const secondaryDimension = rankedDimensions[1]?.[1] > 0 ? rankedDimensions[1][0] : null;

  return {
    records,
    dimensionCounts,
    dominantDimension,
    secondaryDimension,
    dominantInsight: dominantDimension ? DISC_DIMENSION_MAP[dominantDimension] : null,
    secondaryInsight: secondaryDimension ? DISC_DIMENSION_MAP[secondaryDimension] : null,
    interpretationText: extractInterpretationText(rawResponses),
  };
}
