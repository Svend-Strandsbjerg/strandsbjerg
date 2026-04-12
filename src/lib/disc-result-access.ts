import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SharedDiscResultRecord = Prisma.AssessmentResultShareGetPayload<{
  include: {
    assessment: {
      include: {
        company: true;
      };
    };
  };
}>;

export type SharedResultAccess =
  | { status: "missing" }
  | { status: "expired" }
  | {
      status: "ok";
      sharedResult: SharedDiscResultRecord;
    };

export async function getSharedDiscResultAccess(token: string): Promise<SharedResultAccess> {
  const sharedResult = await prisma.assessmentResultShare.findUnique({
    where: { token },
    include: {
      assessment: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!sharedResult) {
    return { status: "missing" };
  }

  if (sharedResult.expiresAt && sharedResult.expiresAt.getTime() < Date.now()) {
    return { status: "expired" };
  }

  return {
    status: "ok",
    sharedResult,
  };
}
