import "server-only";

import type { DiscAssessmentVersion, DiscQuestion, DiscQuestionOption, DiscResponseInput } from "@/lib/disc-types";
import { logServerEvent } from "@/lib/logger";

export type DiscEngineSessionMetadata = {
  source: "strandsbjerg";
  initiatedByUserId?: string;
  companyId?: string;
  inviteToken?: string;
};

export type CreateDiscSessionRequest = {
  assessmentVersionId: string;
  assessment_version_id: string;
  metadata: DiscEngineSessionMetadata;
};

export type CreateDiscSessionResponse = {
  sessionId: string;
  [key: string]: unknown;
};

export type SubmitDiscResponsesRequest = {
  sessionId: string;
  responses: DiscResponseInput[];
};

export type SubmitDiscResponsesResponse = {
  success?: boolean;
  [key: string]: unknown;
};

export type CompleteDiscSessionRequest = {
  sessionId: string;
};

export type CompleteDiscSessionResponse = {
  success?: boolean;
  [key: string]: unknown;
};

export type GetDiscSessionResultResponse = {
  [key: string]: unknown;
};

class DiscEngineError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DiscEngineError";
  }
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[max-depth]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 900 ? `${value.slice(0, 900)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((entry) => sanitizeForLog(entry, depth + 1));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record).slice(0, 40).map(([key, entry]) => [key, sanitizeForLog(entry, depth + 1)]);
    return Object.fromEntries(entries);
  }

  return String(value);
}

function serializeForLog(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(sanitizeForLog(value));
  } catch {
    return String(value);
  }
}

function getRequiredEnv(name: "DISC_ENGINE_BASE_URL" | "DISC_ENGINE_API_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new DiscEngineError(`Missing required env var: ${name}`);
  }

  return value;
}

function buildDiscEngineUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase).toString();
}

function getUrlLogContext(baseUrl: string, path: string) {
  const url = buildDiscEngineUrl(baseUrl, path);

  try {
    const parsedBase = new URL(baseUrl);
    const parsedUrl = new URL(url);
    return {
      url,
      path,
      resolvedPathname: parsedUrl.pathname,
      baseUrlHost: parsedBase.host,
      baseUrlPathname: parsedBase.pathname,
    };
  } catch {
    return {
      url,
      path,
      resolvedPathname: "invalid",
      baseUrlHost: "invalid",
      baseUrlPathname: "invalid",
    };
  }
}

export function validateDiscResponses(payload: unknown): DiscResponseInput[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new DiscEngineError("Responses must be a non-empty array");
  }

  return payload.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new DiscEngineError(`Response at index ${index} must be an object`);
    }

    const sessionId = Reflect.get(item, "sessionId");
    const questionId = Reflect.get(item, "questionId");
    const selectedOptionIds = Reflect.get(item, "selectedOptionIds");

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      throw new DiscEngineError(`Response at index ${index} has an invalid sessionId`);
    }

    if (typeof questionId !== "string" || questionId.trim().length === 0) {
      throw new DiscEngineError(`Response at index ${index} has an invalid questionId`);
    }

    if (!Array.isArray(selectedOptionIds) || selectedOptionIds.length === 0) {
      throw new DiscEngineError(`Response at index ${index} has invalid selectedOptionIds`);
    }

    const normalizedOptionIds = selectedOptionIds.map((optionId) => {
      if (typeof optionId !== "string" || optionId.trim().length === 0) {
        throw new DiscEngineError(`Response at index ${index} has an invalid selectedOptionIds entry`);
      }
      return optionId;
    });

    if (normalizedOptionIds.length !== 1) {
      throw new DiscEngineError(`Response at index ${index} must include exactly one selected option id`);
    }

    return {
      sessionId,
      questionId,
      selectedOptionIds: normalizedOptionIds,
    };
  });
}

async function discEngineRequest<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const apiKey = getRequiredEnv("DISC_ENGINE_API_KEY");
  const baseUrl = getRequiredEnv("DISC_ENGINE_BASE_URL");
  const urlContext = getUrlLogContext(baseUrl, path);

  let response: Response;

  logServerEvent("info", "disc_engine_request_payload", {
    url: urlContext.url,
    path: urlContext.path,
    resolvedPathname: urlContext.resolvedPathname,
    method: "POST",
    baseUrlHost: urlContext.baseUrlHost,
    baseUrlPathname: urlContext.baseUrlPathname,
    hasApiKey: Boolean(apiKey),
    apiKeyLength: apiKey.length,
    payload: sanitizeForLog(payload),
  });

  try {
    response = await fetch(urlContext.url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    logServerEvent("error", "disc_engine_request_failed", {
      path: urlContext.path,
      resolvedPathname: urlContext.resolvedPathname,
      baseUrlHost: urlContext.baseUrlHost,
      baseUrlPathname: urlContext.baseUrlPathname,
      error,
    });
    throw new DiscEngineError(`Failed to call disc-engine ${path}`);
  }

  let parsedBody: unknown = null;
  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  logServerEvent("info", "disc_engine_response_payload", {
    path: urlContext.path,
    resolvedPathname: urlContext.resolvedPathname,
    status: response.status,
    body: sanitizeForLog(parsedBody),
  });

  if (!response.ok) {
    logServerEvent("error", "disc_engine_non_ok_response", {
      path: urlContext.path,
      resolvedPathname: urlContext.resolvedPathname,
      baseUrlHost: urlContext.baseUrlHost,
      baseUrlPathname: urlContext.baseUrlPathname,
      status: response.status,
      hasBody: Boolean(parsedBody),
    });
    throw new DiscEngineError(`disc-engine ${path} failed with status ${response.status}`, response.status, parsedBody);
  }

  return parsedBody as TResponse;
}

async function discEngineGetRequest<TResponse>(path: string): Promise<TResponse> {
  const apiKey = getRequiredEnv("DISC_ENGINE_API_KEY");
  const baseUrl = getRequiredEnv("DISC_ENGINE_BASE_URL");
  const urlContext = getUrlLogContext(baseUrl, path);

  let response: Response;

  logServerEvent("info", "disc_engine_request_payload", {
    url: urlContext.url,
    path: urlContext.path,
    resolvedPathname: urlContext.resolvedPathname,
    method: "GET",
    baseUrlHost: urlContext.baseUrlHost,
    baseUrlPathname: urlContext.baseUrlPathname,
    hasApiKey: Boolean(apiKey),
    apiKeyLength: apiKey.length,
  });

  try {
    response = await fetch(urlContext.url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });
  } catch (error) {
    logServerEvent("error", "disc_engine_request_failed", {
      path: urlContext.path,
      resolvedPathname: urlContext.resolvedPathname,
      baseUrlHost: urlContext.baseUrlHost,
      baseUrlPathname: urlContext.baseUrlPathname,
      error,
    });
    throw new DiscEngineError(`Failed to call disc-engine ${path}`);
  }

  let parsedBody: unknown = null;
  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  logServerEvent("info", "disc_engine_response_payload", {
    path: urlContext.path,
    resolvedPathname: urlContext.resolvedPathname,
    status: response.status,
    body: sanitizeForLog(parsedBody),
  });

  if (!response.ok) {
    logServerEvent("error", "disc_engine_non_ok_response", {
      path: urlContext.path,
      resolvedPathname: urlContext.resolvedPathname,
      baseUrlHost: urlContext.baseUrlHost,
      baseUrlPathname: urlContext.baseUrlPathname,
      status: response.status,
      hasBody: Boolean(parsedBody),
    });
    throw new DiscEngineError(`disc-engine ${path} failed with status ${response.status}`, response.status, parsedBody);
  }

  return parsedBody as TResponse;
}

function readStringKey(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumberKey(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAssessmentVersion(value: unknown): DiscAssessmentVersion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    readStringKey(record, "id") ??
    readStringKey(record, "assessmentVersionId") ??
    readStringKey(record, "assessment_version_id") ??
    readStringKey(record, "versionId");

  if (!id) {
    return null;
  }

  const displayName =
    readStringKey(record, "displayName") ??
    readStringKey(record, "display_name") ??
    readStringKey(record, "name") ??
    readStringKey(record, "label") ??
    id;

  const description =
    readStringKey(record, "description") ??
    readStringKey(record, "summary") ??
    readStringKey(record, "shortDescription") ??
    readStringKey(record, "short_description");

  const intendedUse =
    readStringKey(record, "intendedUse") ??
    readStringKey(record, "intended_use") ??
    readStringKey(record, "useCase") ??
    readStringKey(record, "use_case");

  const expectedQuestionCount =
    readNumberKey(record, "expectedQuestionCount") ??
    readNumberKey(record, "questionCount") ??
    readNumberKey(record, "question_count") ??
    readNumberKey(record, "totalQuestions");

  const estimatedDurationMinutes =
    readNumberKey(record, "estimatedDurationMinutes") ??
    readNumberKey(record, "estimated_minutes") ??
    readNumberKey(record, "durationMinutes") ??
    readNumberKey(record, "estimatedCompletionMinutes");

  return {
    id,
    displayName,
    description,
    intendedUse,
    expectedQuestionCount,
    estimatedDurationMinutes,
    isDefault: record.isDefault === true || record.default === true,
  };
}

function extractAssessmentVersions(payload: unknown): DiscAssessmentVersion[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    root.assessmentVersions,
    root.assessment_versions,
    root.versions,
    root.data,
    root.discovery,
    root.disc,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const versions = candidate.map(parseAssessmentVersion).filter((version): version is DiscAssessmentVersion => Boolean(version));
      if (versions.length > 0) {
        return versions;
      }
    }

    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const candidateRecord = candidate as Record<string, unknown>;
    const nested = candidateRecord.assessmentVersions ?? candidateRecord.assessment_versions ?? candidateRecord.versions;
    if (Array.isArray(nested)) {
      const versions = nested.map(parseAssessmentVersion).filter((version): version is DiscAssessmentVersion => Boolean(version));
      if (versions.length > 0) {
        return versions;
      }
    }
  }

  return [];
}

function extractSessionIdFromCreateSessionResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const directSessionId = readStringKey(root, "sessionId") ?? readStringKey(root, "session_id");
  if (directSessionId) {
    return directSessionId;
  }

  const directId = readStringKey(root, "id");
  if (directId) {
    return directId;
  }

  const data = root.data;
  if (data && typeof data === "object") {
    const dataRecord = data as Record<string, unknown>;
    const nestedSessionId = readStringKey(dataRecord, "sessionId") ?? readStringKey(dataRecord, "session_id") ?? readStringKey(dataRecord, "id");
    if (nestedSessionId) {
      return nestedSessionId;
    }
  }

  const session = root.session;
  if (session && typeof session === "object") {
    const sessionRecord = session as Record<string, unknown>;
    const nestedSessionId = readStringKey(sessionRecord, "sessionId") ?? readStringKey(sessionRecord, "session_id") ?? readStringKey(sessionRecord, "id");
    if (nestedSessionId) {
      return nestedSessionId;
    }
  }

  return null;
}

function parseQuestionOption(value: unknown): DiscQuestionOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const optionId = readStringKey(record, "id") ?? readStringKey(record, "optionId") ?? readStringKey(record, "option_id");
  const optionLabel = readStringKey(record, "label") ?? readStringKey(record, "text");

  if (!optionId || !optionLabel) {
    return null;
  }

  return {
    id: optionId,
    label: optionLabel,
  };
}

function parseQuestion(value: unknown): DiscQuestion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = readStringKey(record, "id") ?? readStringKey(record, "questionId") ?? readStringKey(record, "question_id");
  const prompt = readStringKey(record, "prompt") ?? readStringKey(record, "text") ?? readStringKey(record, "question");

  if (!id || !prompt) {
    return null;
  }

  const rawOptions = Array.isArray(record.options) ? record.options : Array.isArray(record.choices) ? record.choices : [];
  const options = rawOptions.map(parseQuestionOption).filter((option): option is DiscQuestionOption => Boolean(option));

  return {
    id,
    prompt,
    options,
  };
}

function extractQuestionsFromPayload(payload: unknown): DiscQuestion[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    root.questions,
    root.items,
    root.data,
    root.session,
    root.assessment,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const parsed = candidate.map(parseQuestion).filter((question): question is DiscQuestion => Boolean(question));
      if (parsed.length > 0) {
        return parsed;
      }
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const nestedArray = nested.questions ?? nested.items;
      if (Array.isArray(nestedArray)) {
        const parsed = nestedArray.map(parseQuestion).filter((question): question is DiscQuestion => Boolean(question));
        if (parsed.length > 0) {
          return parsed;
        }
      }
    }
  }

  return [];
}

type CreateDiscSessionInput = {
  assessmentVersionId: string;
  initiatedByUserId?: string | null;
  companyId?: string | null;
  inviteToken?: string | null;
};

const DEFAULT_DISCOVERY_PATHS = [
  "/disc/assessment-versions",
  "/disc/discovery",
  "/assessment-versions",
  "/assessments/versions",
  "/versions",
  "/discovery",
] as const;

let cachedDiscoveredVersions: DiscAssessmentVersion[] | null = null;
let cachedDiscoveredVersionsAt = 0;
let cachedDiscoveryError: { at: number; message: string } | null = null;

const DISCOVERY_CACHE_TTL_MS = 60_000;
const DISCOVERY_ERROR_COOLDOWN_MS = 15_000;

function getDiscoveryEndpointCandidates() {
  const configuredPaths = process.env.DISC_ENGINE_DISCOVERY_PATHS
    ?.split(",")
    .map((path) => path.trim())
    .filter(Boolean);

  if (configuredPaths && configuredPaths.length > 0) {
    return configuredPaths;
  }

  return [...DEFAULT_DISCOVERY_PATHS];
}

export async function getDiscAssessmentVersions(): Promise<DiscAssessmentVersion[]> {
  const now = Date.now();
  const baseUrl = getRequiredEnv("DISC_ENGINE_BASE_URL");
  const discoveryCandidates = getDiscoveryEndpointCandidates();

  if (cachedDiscoveredVersions && now - cachedDiscoveredVersionsAt < DISCOVERY_CACHE_TTL_MS) {
    return cachedDiscoveredVersions;
  }

  if (cachedDiscoveryError && now - cachedDiscoveryError.at < DISCOVERY_ERROR_COOLDOWN_MS) {
    throw new DiscEngineError(cachedDiscoveryError.message);
  }

  logServerEvent("info", "disc_version_discovery_started", {
    endpointCandidates: discoveryCandidates,
    attemptedCandidates: discoveryCandidates.map((path) => getUrlLogContext(baseUrl, path)),
  });

  let lastError: DiscEngineError | null = null;

  for (const path of discoveryCandidates) {
    const urlContext = getUrlLogContext(baseUrl, path);

    try {
      const result = await discEngineGetRequest<unknown>(path);
      const versions = extractAssessmentVersions(result);

      if (versions.length === 0) {
        logServerEvent("error", "disc_version_discovery_empty", {
          attemptedPath: path,
          resolvedPathname: urlContext.resolvedPathname,
          attemptedUrl: urlContext.url,
          hasResult: Boolean(result),
          resultKeys: result && typeof result === "object" ? Object.keys(result as Record<string, unknown>).slice(0, 20) : [],
          resultBody: serializeForLog(result),
        });
        throw new DiscEngineError(`disc-engine ${path} returned no assessment versions.`);
      }

      cachedDiscoveredVersions = versions;
      cachedDiscoveredVersionsAt = Date.now();
      cachedDiscoveryError = null;

      logServerEvent("info", "disc_version_discovery_succeeded", {
        path,
        resolvedPathname: urlContext.resolvedPathname,
        attemptedUrl: urlContext.url,
        versionCount: versions.length,
        versions: versions.map((version) => ({
          id: version.id,
          displayName: version.displayName,
          expectedQuestionCount: version.expectedQuestionCount,
          estimatedDurationMinutes: version.estimatedDurationMinutes,
          isDefault: version.isDefault,
        })),
      });

      return versions;
    } catch (error) {
      const normalizedError = error instanceof DiscEngineError ? error : new DiscEngineError("DISC version discovery request failed.");
      lastError = normalizedError;
      logServerEvent("warn", "disc_version_discovery_attempt_failed", {
        attemptedPath: path,
        resolvedPathname: urlContext.resolvedPathname,
        attemptedUrl: urlContext.url,
        status: normalizedError.status ?? null,
        message: normalizedError.message,
        details: serializeForLog(normalizedError.details),
      });
    }
  }

  const finalMessage = "Unable to load DISC assessment versions from disc-engine discovery endpoints.";
  cachedDiscoveryError = {
    at: Date.now(),
    message: finalMessage,
  };

  logServerEvent("error", "disc_version_discovery_failed", {
    attemptedPaths: discoveryCandidates,
    attemptedCandidates: discoveryCandidates.map((path) => getUrlLogContext(baseUrl, path)),
    lastStatus: lastError?.status ?? null,
    lastMessage: lastError?.message ?? null,
    lastDetails: serializeForLog(lastError?.details),
  });

  throw new DiscEngineError(finalMessage, lastError?.status, lastError?.details);
}

export async function createDiscSession(input: CreateDiscSessionInput): Promise<CreateDiscSessionResponse> {
  const payload: CreateDiscSessionRequest = {
    assessmentVersionId: input.assessmentVersionId,
    assessment_version_id: input.assessmentVersionId,
    metadata: {
      source: "strandsbjerg",
      ...(input.initiatedByUserId ? { initiatedByUserId: input.initiatedByUserId } : {}),
      ...(input.companyId ? { companyId: input.companyId } : {}),
      ...(input.inviteToken ? { inviteToken: input.inviteToken } : {}),
    },
  };

  logServerEvent("info", "disc_session_creation_started", {
    assessmentVersionId: input.assessmentVersionId,
    companyId: input.companyId ?? null,
    hasInviteToken: Boolean(input.inviteToken),
    initiatedByUserId: input.initiatedByUserId ?? null,
  });

  const result = await discEngineRequest<unknown>("/sessions", payload);
  const sessionId = extractSessionIdFromCreateSessionResponse(result);

  if (!sessionId) {
    const responseKeys = result && typeof result === "object" ? Object.keys(result as Record<string, unknown>).slice(0, 15) : [];
    const hasDataObject =
      Boolean(result) && typeof result === "object" && "data" in (result as Record<string, unknown>) && typeof (result as Record<string, unknown>).data === "object";
    const hasSessionObject =
      Boolean(result) &&
      typeof result === "object" &&
      "session" in (result as Record<string, unknown>) &&
      typeof (result as Record<string, unknown>).session === "object";

    logServerEvent("error", "disc_engine_malformed_session_response", {
      hasResult: Boolean(result),
      responseKeys,
      hasDataObject,
      hasSessionObject,
    });
    throw new DiscEngineError("disc-engine /sessions returned an invalid payload");
  }

  logServerEvent("info", "disc_session_creation_succeeded", {
    assessmentVersionId: input.assessmentVersionId,
    sessionId,
  });

  if (!result || typeof result !== "object") {
    return { sessionId };
  }

  return {
    ...(result as Record<string, unknown>),
    sessionId,
  };
}

export async function getDiscSessionQuestions(sessionId: string): Promise<DiscQuestion[]> {
  if (!sessionId) {
    throw new DiscEngineError("Missing sessionId for question retrieval");
  }

  const result = await discEngineGetRequest<unknown>(`/sessions/${sessionId}/questions`);
  const questions = extractQuestionsFromPayload(result);

  if (questions.length > 0) {
    return questions;
  }

  throw new DiscEngineError("No DISC question payload was returned for this session.");
}

export async function submitDiscResponses(input: SubmitDiscResponsesRequest): Promise<SubmitDiscResponsesResponse> {
  if (!input.sessionId) {
    throw new DiscEngineError("Missing sessionId for response submission");
  }

  const validatedResponses = validateDiscResponses(input.responses);

  const payload = {
    sessionId: input.sessionId,
    responses: validatedResponses,
  };
  logServerEvent("info", "disc_engine_submit_payload", payload);

  const result = await discEngineRequest<SubmitDiscResponsesResponse>("/responses", payload);

  if (!result || typeof result !== "object") {
    logServerEvent("error", "disc_engine_malformed_responses_response", {
      sessionId: input.sessionId,
    });
    throw new DiscEngineError("disc-engine /responses returned an invalid payload");
  }

  return result;
}

export async function completeDiscSession(input: CompleteDiscSessionRequest): Promise<CompleteDiscSessionResponse> {
  if (!input.sessionId) {
    throw new DiscEngineError("Missing sessionId for completion");
  }

  const result = await discEngineRequest<CompleteDiscSessionResponse>(`/sessions/${input.sessionId}/complete`, {
    sessionId: input.sessionId,
  });

  if (!result || typeof result !== "object") {
    logServerEvent("error", "disc_engine_malformed_complete_response", {
      sessionId: input.sessionId,
    });
    throw new DiscEngineError("disc-engine completion endpoint returned an invalid payload");
  }

  return result;
}

export async function getDiscSessionResult(sessionId: string): Promise<GetDiscSessionResultResponse> {
  if (!sessionId) {
    throw new DiscEngineError("Missing sessionId for result retrieval");
  }

  const result = await discEngineGetRequest<GetDiscSessionResultResponse>(`/sessions/${sessionId}/result`);

  if (!result || typeof result !== "object") {
    logServerEvent("error", "disc_engine_malformed_result_response", { sessionId });
    throw new DiscEngineError("disc-engine result endpoint returned an invalid payload");
  }

  return result;
}

export { DiscEngineError };
