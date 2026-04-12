import "server-only";

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

export type DiscResponseValue = string | number | boolean;

export type DiscResponseInput = {
  questionId: string;
  value: DiscResponseValue;
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

export async function createDiscSession(): Promise<CreateDiscSessionResponse> {
  const assessmentVersionId = getRequiredEnv("DISC_ENGINE_ASSESSMENT_VERSION_ID");

  const payload: CreateDiscSessionRequest = {
    assessmentVersionId,
    metadata: {
      source: "strandsbjerg",
    },
  };

  const result = await discEngineRequest<CreateDiscSessionResponse>("/sessions", payload);

  if (!result || typeof result.sessionId !== "string" || result.sessionId.length === 0) {
    logServerEvent("error", "disc_engine_malformed_session_response", {
      hasResult: Boolean(result),
    });
    throw new DiscEngineError("disc-engine /sessions returned an invalid payload");
  }

  return result;
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
