"use server";

import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";

import type { DiscFlowState } from "@/app/disc/action-state";
import { auth } from "@/lib/auth";
import { createDiscAssessmentRecord, markDiscAssessmentSubmitted } from "@/lib/disc-assessment";
import {
  DiscEngineError,
  completeDiscSession,
  createDiscSession,
  getDiscSessionQuestions,
  getDiscSessionResult,
  submitDiscResponses,
  validateDiscResponses,
} from "@/lib/disc-engine";
import { extractCanonicalResult } from "@/lib/disc-result-insights";
import { assertSelectableVersion, getPersonalDiscVersionEntitlements } from "@/lib/disc-version-entitlements";
import { logServerEvent } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";

const DISC_SESSION_COOKIE = "disc_session_id";
const DISC_SUBMITTED_COOKIE = "disc_submitted_session_id";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DiscEngineError) {
    return error.message;
  }

  return fallback;
}

export async function startDiscAssessment(_: DiscFlowState, formData: FormData): Promise<DiscFlowState> {
  const session = await auth();
  const userId = session?.user?.id ?? "anonymous";
  const cookieStore = await cookies();
  const selectedAssessmentVersionId = String(formData.get("assessmentVersionId") ?? "").trim();
  const existingSessionId = cookieStore.get(DISC_SESSION_COOKIE)?.value;
  const submittedSessionId = cookieStore.get(DISC_SUBMITTED_COOKIE)?.value;

  if (!selectedAssessmentVersionId) {
    return {
      status: "error",
      message: "Vælg en DISC-version før testen startes.",
      sessionId: "",
      questions: [],
    };
  }

  logServerEvent("info", "disc_flow_version_selected", {
    userId,
    assessmentVersionId: selectedAssessmentVersionId,
  });

  let entitlement;
  try {
    const resolution = await getPersonalDiscVersionEntitlements({
      user: {
        id: session?.user?.id ?? "anonymous",
        role: session?.user?.role ?? "USER",
      },
    });
    entitlement = assertSelectableVersion(resolution, selectedAssessmentVersionId);
  } catch (error) {
    logServerEvent("error", "disc_flow_version_entitlements_failed", {
      userId,
      assessmentVersionId: selectedAssessmentVersionId,
      error,
    });
    return {
      status: "error",
      message: toErrorMessage(error, "Unable to validate DISC version access right now."),
      sessionId: "",
      questions: [],
    };
  }

  if (!entitlement) {
    logServerEvent("warn", "disc_flow_session_create_denied", {
      userId,
      assessmentVersionId: selectedAssessmentVersionId,
      reason: "not_entitled",
    });
    return {
      status: "error",
      message: "Du har ikke adgang til den valgte DISC-version.",
      sessionId: "",
      questions: [],
    };
  }

  if (existingSessionId && existingSessionId !== submittedSessionId) {
    try {
      const questions = await getDiscSessionQuestions(existingSessionId);
      logServerEvent("info", "disc_flow_session_reused", { userId, sessionId: existingSessionId, questionCount: questions.length });
      return {
        status: "success",
        message: "Existing DISC session restored.",
        sessionId: existingSessionId,
        questions,
      };
    } catch (error) {
      return {
        status: "error",
        message: toErrorMessage(error, "Existing session was found, but its questions could not be loaded."),
        sessionId: existingSessionId,
        questions: [],
      };
    }
  }

  const rateLimit = enforceRateLimit({ key: `disc-start:${userId}`, limit: 6, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return {
      status: "error",
      message: "Too many start attempts. Please wait a minute and try again.",
      sessionId: "",
      questions: [],
    };
  }

  try {
    logServerEvent("info", "disc_flow_session_create_attempt", {
      userId,
      assessmentVersionId: selectedAssessmentVersionId,
    });

    const createdSession = await createDiscSession({
      assessmentVersionId: selectedAssessmentVersionId,
      initiatedByUserId: session?.user?.id ?? null,
    });
    const questions = await getDiscSessionQuestions(createdSession.sessionId);
    await createDiscAssessmentRecord({
      externalSessionId: createdSession.sessionId,
      assessmentVersionId: selectedAssessmentVersionId,
      userId: session?.user?.id ?? null,
    });

    cookieStore.set(DISC_SESSION_COOKIE, createdSession.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    cookieStore.delete(DISC_SUBMITTED_COOKIE);

    logServerEvent("info", "disc_flow_session_created", {
      userId,
      sessionId: createdSession.sessionId,
      assessmentVersionId: selectedAssessmentVersionId,
    });

    return {
      status: "success",
      message: "DISC session created.",
      sessionId: createdSession.sessionId,
      questions,
    };
  } catch (error) {
    logServerEvent("error", "disc_flow_session_create_failed", {
      userId,
      assessmentVersionId: selectedAssessmentVersionId,
      error,
    });

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to start DISC session right now."),
      sessionId: "",
      questions: [],
    };
  }
}

export async function submitDiscAssessmentResponses(_: DiscFlowState, formData: FormData): Promise<DiscFlowState> {
  const session = await auth();
  const userId = session?.user?.id ?? "anonymous";
  const cookieStore = await cookies();

  const submittedSessionId = cookieStore.get(DISC_SUBMITTED_COOKIE)?.value;
  const cookieSessionId = cookieStore.get(DISC_SESSION_COOKIE)?.value;
  const formSessionId = String(formData.get("sessionId") ?? "").trim();
  const responsesRaw = String(formData.get("responses") ?? "").trim();
  const sessionId = formSessionId || cookieSessionId || "";

  if (!sessionId) {
    return {
      status: "error",
      message: "Session was not found. Please start the DISC session again.",
      sessionId: "",
      questions: [],
    };
  }

  if (submittedSessionId === sessionId) {
    return {
      status: "success",
      message: "Responses already submitted for this session.",
      sessionId,
      questions: [],
    };
  }

  if (cookieSessionId && formSessionId && cookieSessionId !== formSessionId) {
    logServerEvent("warn", "disc_flow_session_id_mismatch", { userId, sessionId });
    return {
      status: "error",
      message: "Session mismatch detected. Please restart the DISC session.",
      sessionId: "",
      questions: [],
    };
  }

  const rateLimit = enforceRateLimit({ key: `disc-submit:${userId}:${sessionId}`, limit: 3, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return {
      status: "error",
      message: "Too many submit attempts. Please wait before trying again.",
      sessionId,
      questions: [],
    };
  }

  let parsedResponses: unknown;
  try {
    parsedResponses = JSON.parse(responsesRaw);
  } catch {
    return {
      status: "error",
      message: "Responses must be valid JSON.",
      sessionId,
      questions: [],
    };
  }

  let validatedResponses;
  try {
    validatedResponses = validateDiscResponses(parsedResponses);
  } catch (error) {
    return {
      status: "error",
      message: toErrorMessage(error, "Responses are invalid."),
      sessionId,
      questions: [],
    };
  }

  try {
    await submitDiscResponses({
      sessionId,
      responses: validatedResponses,
    });
    logServerEvent("info", "disc_flow_complete_call_started", { userId, sessionId });
    await completeDiscSession({ sessionId });
    logServerEvent("info", "disc_flow_complete_call_succeeded", { userId, sessionId });
    logServerEvent("info", "disc_flow_result_fetch_started", { userId, sessionId });
    const resultPayload = await getDiscSessionResult(sessionId);
    logServerEvent("info", "disc_flow_result_payload_raw", { userId, sessionId, resultPayload });
    const mappedResult = extractCanonicalResult({ result: resultPayload });
    logServerEvent("info", "disc_flow_result_payload_mapped", { userId, sessionId, mappedResult });
    const resultRecord = resultPayload as Record<string, unknown>;
    const dimensionsPayload = resultRecord.result && typeof resultRecord.result === "object"
      ? (resultRecord.result as Record<string, unknown>).dimensions
      : resultRecord.dimensions;
    const profileSummaryPayload = resultRecord.result && typeof resultRecord.result === "object"
      ? (resultRecord.result as Record<string, unknown>).profileSummary
      : resultRecord.profileSummary;
    const qualityIndicatorsPayload = resultRecord.result && typeof resultRecord.result === "object"
      ? (resultRecord.result as Record<string, unknown>).qualityIndicators
      : resultRecord.qualityIndicators;
    logServerEvent("info", "disc_flow_result_fetch_succeeded", {
      userId,
      sessionId,
      hasDimensions: Boolean(dimensionsPayload),
      hasProfileSummary: typeof profileSummaryPayload === "string",
      hasQualityIndicators: Boolean(qualityIndicatorsPayload),
    });
    const persistedPayload = {
      responses: validatedResponses,
      result: JSON.parse(JSON.stringify(resultPayload)) as Prisma.InputJsonValue,
    } satisfies Prisma.InputJsonValue;
    await markDiscAssessmentSubmitted({
      externalSessionId: sessionId,
      rawResponses: persistedPayload,
    });
    logServerEvent("info", "disc_flow_result_persisted", {
      userId,
      sessionId,
      persistedResultKeys: Object.keys(resultRecord).slice(0, 20).join(","),
    });

    cookieStore.set(DISC_SUBMITTED_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    logServerEvent("info", "disc_flow_responses_submitted", { userId, sessionId, responseCount: validatedResponses.length });

    return {
      status: "success",
      message: "Responses submitted successfully.",
      sessionId,
      questions: [],
    };
  } catch (error) {
    logServerEvent("error", "disc_flow_responses_submit_failed", { userId, sessionId, error });

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to submit responses right now."),
      sessionId,
      questions: [],
    };
  }
}
