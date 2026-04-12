import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const DEFAULT_RESULT_LINK_EXPIRY_DAYS = 30;

function createToken() {
  return randomBytes(32).toString("hex");
}

export async function ensureAssessmentResultShare(assessmentId: string, expiresAt?: Date | null) {
  const existing = await prisma.assessmentResultShare.findUnique({ where: { assessmentId } });

  if (existing) {
    if (expiresAt && (!existing.expiresAt || existing.expiresAt.getTime() !== expiresAt.getTime())) {
      return prisma.assessmentResultShare.update({
        where: { id: existing.id },
        data: { expiresAt },
      });
    }

    return existing;
  }

  return prisma.assessmentResultShare.create({
    data: {
      assessmentId,
      token: createToken(),
      expiresAt: expiresAt ?? new Date(Date.now() + DEFAULT_RESULT_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });
}

export function buildResultLink(origin: string, token: string) {
  return `${origin}/disc/result/${token}`;
}
