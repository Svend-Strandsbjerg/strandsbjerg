"use server";

import { revalidatePath } from "next/cache";
import { AssessmentInviteStatus } from "@prisma/client";

import { createDiscAssessmentRecord, markDiscAssessmentSubmitted } from "@/lib/disc-assessment";
import { DiscEngineError, createDiscSession, submitDiscResponses, validateDiscResponses } from "@/lib/disc-engine";
import { getInviteAccessState } from "@/lib/disc-invites";
import { prisma } from "@/lib/prisma";

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
    throw new Error("Invite not valid");
  }

  return invite;
}

export async function startInviteDiscAssessment(_: InviteDiscState, formData: FormData): Promise<InviteDiscState> {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return { status: "error", message: "Invalid invite token.", sessionId: "" };
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
  } catch {
    return {
      status: "error",
      message: "This invite is invalid, expired, or already completed.",
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

    await prisma.assessmentInvite.update({
      where: { id: invite.id },
      data: { status: AssessmentInviteStatus.COMPLETED },
    });

    revalidatePath(`/disc/invite/${token}`);

    return { status: "success", message: "Responses submitted successfully.", sessionId };
  } catch (error) {
    return {
      status: "error",
      message: toErrorMessage(error, "Unable to submit responses right now."),
      sessionId,
    };
  }
}
