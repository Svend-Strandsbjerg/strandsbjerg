import "server-only";

import crypto from "node:crypto";
import { AssessmentInviteStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const INVITE_TOKEN_BYTES = 32;

export function generateAssessmentInviteToken() {
  return crypto.randomBytes(INVITE_TOKEN_BYTES).toString("hex");
}

export async function createUniqueAssessmentInviteToken() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateAssessmentInviteToken();
    const existing = await prisma.assessmentInvite.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!existing) {
      return token;
    }
  }

  throw new Error("Unable to generate unique invite token");
}

export function isInviteUsable(status: AssessmentInviteStatus, expiresAt: Date) {
  return status === AssessmentInviteStatus.ACTIVE && expiresAt.getTime() > Date.now();
}

export type InviteAccessState = "active" | "expired" | "invalidated" | "completed";

export function getInviteAccessState(status: AssessmentInviteStatus, expiresAt: Date): InviteAccessState {
  if (status === AssessmentInviteStatus.INVALIDATED) {
    return "invalidated";
  }

  if (status === AssessmentInviteStatus.COMPLETED) {
    return "completed";
  }

  if (expiresAt.getTime() <= Date.now()) {
    return "expired";
  }

  return "active";
}
