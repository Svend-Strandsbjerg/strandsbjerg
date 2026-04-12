import type { Prisma } from "@prisma/client";

import { logServerEvent } from "@/lib/logger";
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
    logServerEvent("warn", "disc_result_invalid_token_access", { resultToken: token, reason: "missing" });
    return { status: "missing" };
  }

  if (sharedResult.expiresAt && sharedResult.expiresAt.getTime() < Date.now()) {
    logServerEvent("warn", "disc_result_invalid_token_access", { resultToken: token, reason: "expired" });
    return { status: "expired" };
  }

  return {
    status: "ok",
    sharedResult,
  };
}
