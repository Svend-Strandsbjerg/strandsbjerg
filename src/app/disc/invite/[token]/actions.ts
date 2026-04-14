"use server";

import { revalidatePath } from "next/cache";
import { AssessmentInviteStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { createDiscAssessmentRecord, markDiscAssessmentSubmitted } from "@/lib/disc-assessment";
import type { DiscQuestion } from "@/lib/disc-types";
import {
  DiscEngineError,
  completeDiscSession,
  createDiscSession,
  getDiscSessionQuestions,
  getDiscSessionResult,
  submitDiscResponses,
  validateDiscResponses,
} from "@/lib/disc-engine";
import { getInviteAccessState } from "@/lib/disc-invites";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

export type InviteDiscState = {
  status: "idle" | "success" | "error";
  message: string;
  sessionId: string;
  questions: DiscQuestion[];
};

export const initialInviteDiscState: InviteDiscState = {
  status: "idle",
  message: "",
  sessionId: "",
  questions: [],
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DiscEngineError) {
    return error.message;
  }

  return fallback;
}

async function getActiveInviteOrThrow(token: string) {
  const invite = await prisma.assessmentInvite.findUnique({
    where: { token },
    select: {
      id: true,
      companyId: true,
      candidateName: true,
      candidateEmail: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invite || getInviteAccessState(invite.status, invite.expiresAt) !== "active") {
    logServerEvent("warn", "disc_invite_invalid_token_access", {
      inviteToken: token,
      hasInvite: Boolean(invite),
      status: invite?.status,
    });
    throw new Error("Invite not valid");
  }

  return invite;
}

export async function startInviteDiscAssessment(_: InviteDiscState, formData: FormData): Promise<InviteDiscState> {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return { status: "error", message: "Invalid invite token.", sessionId: "", questions: [] };
  }

  const rateLimit = enforceRateLimit({
    key: `invite-start:${token}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { status: "error", message: "Too many attempts. Please wait a minute and try again.", sessionId: "", questions: [] };
  }

  try {
    const invite = await getActiveInviteOrThrow(token);
    const existingAssessment = await prisma.discAssessment.findFirst({
      where: {
        inviteId: invite.id,
        status: "STARTED",
      },
      orderBy: { createdAt: "desc" },
      select: { externalSessionId: true },
    });

    if (existingAssessment) {
      return {
        status: "success",
        message: "Existing session restored.",
        sessionId: existingAssessment.externalSessionId,
        questions: await getDiscSessionQuestions(existingAssessment.externalSessionId),
      };
    }

    const createdSession = await createDiscSession();
    const questions = await getDiscSessionQuestions(createdSession.sessionId);
    await createDiscAssessmentRecord({
      externalSessionId: createdSession.sessionId,
      inviteId: invite.id,
      companyId: invite.companyId,
      candidateName: invite.candidateName,
      candidateEmail: invite.candidateEmail,
    });

    return {
      status: "success",
      message: "DISC session created.",
      sessionId: createdSession.sessionId,
      questions,
    };
  } catch (error) {
    logServerEvent("error", "disc_invite_start_failed", {
      inviteToken: token,
      error,
    });

    if (error instanceof Error && error.message === "Invite not valid") {
      return {
        status: "error",
        message: "This invite is invalid, expired, or already completed.",
        sessionId: "",
        questions: [],
      };
    }

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to start the DISC assessment right now. Please try again shortly."),
      sessionId: "",
      questions: [],
    };
  }
}

export async function submitInviteDiscAssessment(_: InviteDiscState, formData: FormData): Promise<InviteDiscState> {
  const token = String(formData.get("token") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const responsesRaw = String(formData.get("responses") ?? "").trim();

  if (!token || !sessionId) {
    return { status: "error", message: "Invalid submission request.", sessionId: "", questions: [] };
  }

  const rateLimit = enforceRateLimit({
    key: `invite-submit:${token}:${sessionId}`,
    limit: 3,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return { status: "error", message: "Too many submission attempts. Please wait before trying again.", sessionId, questions: [] };
  }

  let parsedResponses: unknown;

  try {
    parsedResponses = JSON.parse(responsesRaw);
  } catch {
    return { status: "error", message: "Responses must be valid JSON.", sessionId, questions: [] };
  }

  let validatedResponses;
  try {
    validatedResponses = validateDiscResponses(parsedResponses);
  } catch (error) {
    return { status: "error", message: toErrorMessage(error, "Responses are invalid."), sessionId, questions: [] };
  }

  try {
    const invite = await getActiveInviteOrThrow(token);
    const matchingAssessment = await prisma.discAssessment.findFirst({
      where: {
        inviteId: invite.id,
        externalSessionId: sessionId,
      },
      select: { id: true, status: true },
    });

    if (!matchingAssessment || matchingAssessment.status !== "STARTED") {
      return { status: "error", message: "Session does not match invite or is already submitted.", sessionId, questions: [] };
    }

    await submitDiscResponses({ sessionId, responses: validatedResponses });
    logServerEvent("info", "disc_invite_complete_call_started", { sessionId });
    await completeDiscSession({ sessionId });
    logServerEvent("info", "disc_invite_complete_call_succeeded", { sessionId });
    logServerEvent("info", "disc_invite_result_fetch_started", { sessionId });
    const resultPayload = await getDiscSessionResult(sessionId);
    const resultRecord = resultPayload as Record<string, unknown>;
    const nestedResult = resultRecord.result && typeof resultRecord.result === "object" ? (resultRecord.result as Record<string, unknown>) : null;
    logServerEvent("info", "disc_invite_result_fetch_succeeded", {
      sessionId,
      hasDimensions: Boolean((nestedResult ?? resultRecord).dimensions),
      hasProfileSummary: typeof (nestedResult ?? resultRecord).profileSummary === "string",
      hasQualityIndicators: Boolean((nestedResult ?? resultRecord).qualityIndicators),
    });
    const persistedPayload = {
      responses: validatedResponses,
      result: JSON.parse(JSON.stringify(resultPayload)) as Prisma.InputJsonValue,
    } satisfies Prisma.InputJsonValue;
    await markDiscAssessmentSubmitted({
      externalSessionId: sessionId,
      rawResponses: persistedPayload,
    });
    logServerEvent("info", "disc_invite_result_persisted", {
      sessionId,
      persistedResultKeys: Object.keys(resultRecord).slice(0, 20).join(","),
    });

    await prisma.assessmentInvite.updateMany({
      where: { id: invite.id, status: AssessmentInviteStatus.ACTIVE },
      data: { status: AssessmentInviteStatus.COMPLETED },
    });

    const submittedCountForCompany = invite.companyId
      ? await prisma.discAssessment.count({
          where: {
            companyId: invite.companyId,
            status: "SUBMITTED",
          },
        })
      : 0;

    if (invite.companyId && submittedCountForCompany === 1) {
      logServerEvent("info", "disc_beta_first_completion", {
        companyId: invite.companyId,
        inviteId: invite.id,
        sessionId,
      });
    }

    revalidatePath(`/disc/invite/${token}`);

    return { status: "success", message: "Responses submitted successfully.", sessionId, questions: [] };
  } catch (error) {
    logServerEvent("error", "disc_invite_submit_failed", {
      inviteToken: token,
      sessionId,
      error,
    });

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to submit responses right now."),
      sessionId,
      questions: [],
    };
  }
}
