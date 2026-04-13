"use server";

import { cookies } from "next/headers";

import type { DiscFlowState } from "@/app/disc/action-state";
import { auth } from "@/lib/auth";
import { createDiscAssessmentRecord, markDiscAssessmentSubmitted } from "@/lib/disc-assessment";
import { DiscEngineError, createDiscSession, submitDiscResponses, validateDiscResponses } from "@/lib/disc-engine";
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

export async function startDiscAssessment(_: DiscFlowState): Promise<DiscFlowState> {
  const session = await auth();
  const userId = session?.user?.id ?? "anonymous";
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(DISC_SESSION_COOKIE)?.value;
  const submittedSessionId = cookieStore.get(DISC_SUBMITTED_COOKIE)?.value;

  if (existingSessionId && existingSessionId !== submittedSessionId) {
    logServerEvent("info", "disc_flow_session_reused", { userId, sessionId: existingSessionId });
    return {
      status: "success",
      message: "Existing DISC session restored.",
      sessionId: existingSessionId,
    };
  }

  const rateLimit = enforceRateLimit({ key: `disc-start:${userId}`, limit: 6, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return {
      status: "error",
      message: "Too many start attempts. Please wait a minute and try again.",
      sessionId: "",
    };
  }

  try {
    const createdSession = await createDiscSession();
    await createDiscAssessmentRecord({
      externalSessionId: createdSession.sessionId,
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

    logServerEvent("info", "disc_flow_session_created", { userId, sessionId: createdSession.sessionId });

    return {
      status: "success",
      message: "DISC session created.",
      sessionId: createdSession.sessionId,
    };
  } catch (error) {
    logServerEvent("error", "disc_flow_session_create_failed", { userId, error });

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to start DISC session right now."),
      sessionId: "",
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
    };
  }

  if (submittedSessionId === sessionId) {
    return {
      status: "success",
      message: "Responses already submitted for this session.",
      sessionId,
    };
  }

  if (cookieSessionId && formSessionId && cookieSessionId !== formSessionId) {
    logServerEvent("warn", "disc_flow_session_id_mismatch", { userId, sessionId });
    return {
      status: "error",
      message: "Session mismatch detected. Please restart the DISC session.",
      sessionId: "",
    };
  }

  const rateLimit = enforceRateLimit({ key: `disc-submit:${userId}:${sessionId}`, limit: 3, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return {
      status: "error",
      message: "Too many submit attempts. Please wait before trying again.",
      sessionId,
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
    };
  }

  try {
    await submitDiscResponses({
      sessionId,
      responses: validatedResponses,
    });
    await markDiscAssessmentSubmitted({
      externalSessionId: sessionId,
      rawResponses: validatedResponses,
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
    };
  } catch (error) {
    logServerEvent("error", "disc_flow_responses_submit_failed", { userId, sessionId, error });

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to submit responses right now."),
      sessionId,
    };
  }
}
