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
import { canPromoGrantTierAccess } from "@/lib/disc-promo";
import { clearDiscPromoRedemptionContext, readDiscPromoRedemptionContext } from "@/lib/disc-promo-context";
import { assertSelectableVersion, getPersonalDiscVersionEntitlements, inferDiscVersionCategory } from "@/lib/disc-version-entitlements";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
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
  const sessionUserId = session?.user?.id ?? null;
  const userId = session?.user?.id ?? "anonymous";
  const cookieStore = await cookies();
  const selectedAssessmentVersionId = String(formData.get("assessmentVersionId") ?? "").trim();
  const promoRedemptionId = await readDiscPromoRedemptionContext();
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
  let resolutionSummary:
    | {
        source: string;
        maxTier: string;
        selectableVersionIds: string[];
        visibleVersionIds: string[];
      }
    | undefined;
  try {
    const resolution = await getPersonalDiscVersionEntitlements({
      user: {
        id: session?.user?.id ?? "anonymous",
        role: session?.user?.role ?? "USER",
      },
    });
    resolutionSummary = {
      source: resolution.policy.source,
      maxTier: resolution.policy.maxTier,
      selectableVersionIds: resolution.selectableEntitlements.map((item) => item.version.id),
      visibleVersionIds: resolution.visibleEntitlements.map((item) => item.version.id),
    };
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
      entitlementSource: resolutionSummary?.source ?? null,
      entitlementMaxTier: resolutionSummary?.maxTier ?? null,
      selectableVersionIds: resolutionSummary?.selectableVersionIds ?? [],
      visibleVersionIds: resolutionSummary?.visibleVersionIds ?? [],
      flow: "personal",
    });
    return {
      status: "error",
      message: "Den valgte DISC-version er ikke tilgængelig for din konto. Vælg en tilgængelig version.",
      sessionId: "",
      questions: [],
    };
  }

  if (promoRedemptionId) {
    logServerEvent("info", "disc_promo_start_attempt", {
      userId,
      promoRedemptionId,
      assessmentVersionId: selectedAssessmentVersionId,
    });

    const versionCategory = inferDiscVersionCategory(entitlement.version);
    const promoRedemption = await prisma.discPromoRedemption.findUnique({
      where: { id: promoRedemptionId },
      select: {
        id: true,
        userId: true,
        grantedCredits: true,
        consumedCredits: true,
        promoLink: {
          select: {
            id: true,
            grantTier: true,
            active: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!promoRedemption || promoRedemption.userId !== session?.user?.id) {
      await clearDiscPromoRedemptionContext();
    } else {
      const availableCredits = promoRedemption.grantedCredits - promoRedemption.consumedCredits;
      const promoLinkExpired = Boolean(promoRedemption.promoLink.expiresAt && promoRedemption.promoLink.expiresAt.getTime() <= Date.now());
      if (!promoRedemption.promoLink.active || promoLinkExpired || availableCredits <= 0) {
        await clearDiscPromoRedemptionContext();
        return {
          status: "error",
          message: "Din kampagnekredit er ikke længere gyldig. Åbn et nyt promo-link for at få adgang.",
          sessionId: "",
          questions: [],
        };
      }

      if (!canPromoGrantTierAccess(promoRedemption.promoLink.grantTier, versionCategory)) {
        return {
          status: "error",
          message: "Denne DISC-version er ikke inkluderet i kampagnens gratis adgang.",
          sessionId: "",
          questions: [],
        };
      }
    }
  }

  if (existingSessionId && existingSessionId !== submittedSessionId) {
    try {
      const matchingSessionAssessment = await prisma.discAssessment.findUnique({
        where: { externalSessionId: existingSessionId },
        select: { assessmentVersionId: true, userId: true },
      });

      const canReuse = Boolean(
        matchingSessionAssessment &&
          matchingSessionAssessment.userId === (session?.user?.id ?? null) &&
          matchingSessionAssessment.assessmentVersionId === selectedAssessmentVersionId,
      );

      if (!canReuse) {
        cookieStore.delete(DISC_SESSION_COOKIE);
      } else {
      const questions = await getDiscSessionQuestions(existingSessionId);
      logServerEvent("info", "disc_flow_session_reused", { userId, sessionId: existingSessionId, questionCount: questions.length });
      return {
        status: "success",
        message: "Existing DISC session restored.",
        sessionId: existingSessionId,
        questions,
      };
      }
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
    let consumedPromoRedemptionId: string | null = null;
    if (promoRedemptionId && sessionUserId) {
      const consumed = await prisma.$transaction(async (tx) => {
        const redemption = await tx.discPromoRedemption.findUnique({
          where: { id: promoRedemptionId },
          select: { userId: true, consumedCredits: true, grantedCredits: true },
        });

        if (!redemption || redemption.userId !== sessionUserId || redemption.consumedCredits >= redemption.grantedCredits) {
          return false;
        }

        await tx.discPromoRedemption.update({
          where: { id: promoRedemptionId },
          data: {
            consumedCredits: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
        return true;
      });

      if (!consumed) {
        await clearDiscPromoRedemptionContext();
        return {
          status: "error",
          message: "Din kampagnekredit kunne ikke bruges. Prøv at åbne promo-linket igen.",
          sessionId: "",
          questions: [],
        };
      }

      consumedPromoRedemptionId = promoRedemptionId;
      logServerEvent("info", "disc_promo_credit_consumed_on_start", {
        userId: sessionUserId,
        promoRedemptionId,
        assessmentVersionId: selectedAssessmentVersionId,
        sessionId: createdSession.sessionId,
      });
    }

    await createDiscAssessmentRecord({
      externalSessionId: createdSession.sessionId,
      assessmentVersionId: selectedAssessmentVersionId,
      userId: sessionUserId,
      promoRedemptionId: consumedPromoRedemptionId,
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
    if (consumedPromoRedemptionId) {
      logServerEvent("info", "disc_promo_start_session_created", {
        userId,
        promoRedemptionId: consumedPromoRedemptionId,
        sessionId: createdSession.sessionId,
        assessmentVersionId: selectedAssessmentVersionId,
      });
    }

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
