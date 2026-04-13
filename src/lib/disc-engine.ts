import "server-only";

import type { DiscQuestion, DiscQuestionOption, DiscResponseInput, DiscResponseValue } from "@/lib/disc-types";
import { logServerEvent } from "@/lib/logger";

export type DiscEngineSessionMetadata = {
  source: "strandsbjerg";
};

export type CreateDiscSessionRequest = {
  assessmentVersionId: string;
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

function getRequiredEnv(name: "DISC_ENGINE_BASE_URL" | "DISC_ENGINE_API_KEY" | "DISC_ENGINE_ASSESSMENT_VERSION_ID") {
  const value = process.env[name];

  if (!value) {
    throw new DiscEngineError(`Missing required env var: ${name}`);
  }

  return value;
}

export function validateDiscResponses(payload: unknown): DiscResponseInput[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new DiscEngineError("Responses must be a non-empty array");
  }

  return payload.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new DiscEngineError(`Response at index ${index} must be an object`);
    }

    const questionId = Reflect.get(item, "questionId");
    const value = Reflect.get(item, "value");

    if (typeof questionId !== "string" || questionId.trim().length === 0) {
      throw new DiscEngineError(`Response at index ${index} has an invalid questionId`);
    }

    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new DiscEngineError(`Response at index ${index} has an invalid value`);
    }

    return {
      questionId,
      value: value as DiscResponseValue,
    };
  });
}

async function discEngineRequest<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const apiKey = getRequiredEnv("DISC_ENGINE_API_KEY");
  const baseUrl = getRequiredEnv("DISC_ENGINE_BASE_URL");

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    logServerEvent("error", "disc_engine_request_failed", { path, error });
    throw new DiscEngineError(`Failed to call disc-engine ${path}`);
  }

  let parsedBody: unknown = null;
  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    logServerEvent("error", "disc_engine_non_ok_response", {
      path,
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

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });
  } catch (error) {
    logServerEvent("error", "disc_engine_request_failed", { path, error });
    throw new DiscEngineError(`Failed to call disc-engine ${path}`);
  }

  let parsedBody: unknown = null;
  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    logServerEvent("error", "disc_engine_non_ok_response", {
      path,
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
  if (typeof value === "string") {
    return { value, label: value };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { value, label: String(value) };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const optionValue = record.value ?? record.id ?? record.key;
  const optionLabel = record.label ?? record.text ?? optionValue;

  if (!["string", "number", "boolean"].includes(typeof optionValue) || typeof optionLabel !== "string" || optionLabel.trim().length === 0) {
    return null;
  }

  return {
    value: optionValue as DiscResponseValue,
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

export async function createDiscSession(): Promise<CreateDiscSessionResponse> {
  const assessmentVersionId = getRequiredEnv("DISC_ENGINE_ASSESSMENT_VERSION_ID");

  const payload: CreateDiscSessionRequest = {
    assessmentVersionId,
    metadata: {
      source: "strandsbjerg",
    },
  };

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

  if (!result || typeof result !== "object") {
    return { sessionId };
  }

  return {
    ...(result as Record<string, unknown>),
    sessionId,
  };
}

export async function getDiscSessionQuestions(sessionId: string, sessionPayload?: unknown): Promise<DiscQuestion[]> {
  if (!sessionId) {
    throw new DiscEngineError("Missing sessionId for question retrieval");
  }

  const payloadQuestions = extractQuestionsFromPayload(sessionPayload);
  if (payloadQuestions.length > 0) {
    return payloadQuestions;
  }

  const paths = [`/sessions/${sessionId}/questions`, `/questions?sessionId=${encodeURIComponent(sessionId)}`];

  for (const path of paths) {
    try {
      const result = await discEngineGetRequest<unknown>(path);
      const questions = extractQuestionsFromPayload(result);
      if (questions.length > 0) {
        return questions;
      }
    } catch (error) {
      if (error instanceof DiscEngineError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  throw new DiscEngineError("No DISC question payload was returned for this session.");
}

export async function submitDiscResponses(input: SubmitDiscResponsesRequest): Promise<SubmitDiscResponsesResponse> {
  if (!input.sessionId) {
    throw new DiscEngineError("Missing sessionId for response submission");
  }

  const validatedResponses = validateDiscResponses(input.responses);

  const result = await discEngineRequest<SubmitDiscResponsesResponse>("/responses", {
    sessionId: input.sessionId,
    responses: validatedResponses,
  });

  if (!result || typeof result !== "object") {
    logServerEvent("error", "disc_engine_malformed_responses_response", {
      sessionId: input.sessionId,
    });
    throw new DiscEngineError("disc-engine /responses returned an invalid payload");
  }

  return result;
}

export { DiscEngineError };
