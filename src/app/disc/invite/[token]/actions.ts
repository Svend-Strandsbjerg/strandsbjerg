"use server";

import { revalidatePath } from "next/cache";
import { AssessmentInviteStatus } from "@prisma/client";

import { createDiscAssessmentRecord, markDiscAssessmentSubmitted } from "@/lib/disc-assessment";
import { DiscEngineError, createDiscSession, submitDiscResponses, validateDiscResponses } from "@/lib/disc-engine";
import { getInviteAccessState } from "@/lib/disc-invites";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

export type InviteDiscState = {
  status: "idle" | "success" | "error";
  message: string;
  sessionId: string;
};

export const initialInviteDiscState: InviteDiscState = {
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
    return { status: "error", message: "Invalid invite token.", sessionId: "" };
  }

  const rateLimit = enforceRateLimit({
    key: `invite-start:${token}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { status: "error", message: "Too many attempts. Please wait a minute and try again.", sessionId: "" };
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
      };
    }

    const createdSession = await createDiscSession();
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
      };
    }

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to start the DISC assessment right now. Please try again shortly."),
      sessionId: "",
    };
  }
}

export async function submitInviteDiscAssessment(_: InviteDiscState, formData: FormData): Promise<InviteDiscState> {
  const token = String(formData.get("token") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const responsesRaw = String(formData.get("responses") ?? "").trim();

  if (!token || !sessionId) {
    return { status: "error", message: "Invalid submission request.", sessionId: "" };
  }

  const rateLimit = enforceRateLimit({
    key: `invite-submit:${token}:${sessionId}`,
    limit: 3,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return { status: "error", message: "Too many submission attempts. Please wait before trying again.", sessionId };
  }

  let parsedResponses: unknown;

  try {
    parsedResponses = JSON.parse(responsesRaw);
  } catch {
    return { status: "error", message: "Responses must be valid JSON.", sessionId };
  }

  let validatedResponses;
  try {
    validatedResponses = validateDiscResponses(parsedResponses);
  } catch (error) {
    return { status: "error", message: toErrorMessage(error, "Responses are invalid."), sessionId };
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
      return { status: "error", message: "Session does not match invite or is already submitted.", sessionId };
    }

    await submitDiscResponses({ sessionId, responses: validatedResponses });
    await markDiscAssessmentSubmitted({ externalSessionId: sessionId, rawResponses: validatedResponses });

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

    return { status: "success", message: "Responses submitted successfully.", sessionId };
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
    };
  }
}
