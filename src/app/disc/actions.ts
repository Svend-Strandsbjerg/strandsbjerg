"use server";

import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { DiscEngineError, createDiscSession, submitDiscResponses, validateDiscResponses } from "@/lib/disc-engine";

const DISC_SESSION_COOKIE = "disc_session_id";
const DISC_SUBMITTED_COOKIE = "disc_submitted_session_id";

export type DiscFlowState = {
  status: "idle" | "success" | "error";
  message: string;
  sessionId: string;
};

export const initialDiscFlowState: DiscFlowState = {
  status: "idle",
  message: "",
  sessionId: "",
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DiscEngineError) {
    return error.message;
  }

  return fallback;
}

export async function startDiscAssessment(_: DiscFlowState): Promise<DiscFlowState> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(DISC_SESSION_COOKIE)?.value;
  const submittedSessionId = cookieStore.get(DISC_SUBMITTED_COOKIE)?.value;

  if (existingSessionId && existingSessionId !== submittedSessionId) {
    console.info("[disc-flow] session_reused", { userId, sessionId: existingSessionId });
    return {
      status: "success",
      message: "Existing DISC session restored.",
      sessionId: existingSessionId,
    };
  }

  try {
    const createdSession = await createDiscSession();

    cookieStore.set(DISC_SESSION_COOKIE, createdSession.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    cookieStore.delete(DISC_SUBMITTED_COOKIE);

    console.info("[disc-flow] session_created", { userId, sessionId: createdSession.sessionId });

    return {
      status: "success",
      message: "DISC session created.",
      sessionId: createdSession.sessionId,
    };
  } catch (error) {
    console.error("[disc-flow] session_create_failed", { userId, error });

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to start DISC session right now."),
      sessionId: "",
    };
  }
}

export async function submitDiscAssessmentResponses(_: DiscFlowState, formData: FormData): Promise<DiscFlowState> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
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
    console.warn("[disc-flow] session_id_mismatch", { userId, formSessionId, cookieSessionId });
    return {
      status: "error",
      message: "Session mismatch detected. Please restart the DISC session.",
      sessionId: "",
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

    cookieStore.set(DISC_SUBMITTED_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    console.info("[disc-flow] responses_submitted", { userId, sessionId, responseCount: validatedResponses.length });

    return {
      status: "success",
      message: "Responses submitted successfully.",
      sessionId,
    };
  } catch (error) {
    console.error("[disc-flow] responses_submit_failed", { userId, sessionId, error });

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to submit responses right now."),
      sessionId,
    };
  }
}
