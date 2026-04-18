import crypto from "node:crypto";

import { DiscTierAccess, Prisma } from "@prisma/client";

import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const PROMO_TOKEN_BYTES = 24;

export type PromoLinkState = "active" | "inactive" | "expired" | "exhausted";

export function generateDiscPromoToken() {
  return crypto.randomBytes(PROMO_TOKEN_BYTES).toString("hex");
}

export async function createUniqueDiscPromoToken() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateDiscPromoToken();
    const existing = await prisma.discPromoLink.findUnique({ where: { token }, select: { id: true } });

    if (!existing) {
      return token;
    }
  }

  throw new Error("Unable to generate unique DISC promo token");
}

export function getDiscPromoLinkState(link: { active: boolean; expiresAt: Date | null; maxRedemptions: number | null; totalRedemptions: number }) {
  if (!link.active) {
    return "inactive" satisfies PromoLinkState;
  }

  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    return "expired" satisfies PromoLinkState;
  }

  if (link.maxRedemptions !== null && link.totalRedemptions >= link.maxRedemptions) {
    return "exhausted" satisfies PromoLinkState;
  }

  return "active" satisfies PromoLinkState;
}

export async function redeemDiscPromoLink(params: { token: string; userId: string }) {
  const link = await prisma.discPromoLink.findUnique({
    where: { token: params.token },
    select: {
      id: true,
      token: true,
      label: true,
      grantTier: true,
      grantCredits: true,
      oneRedemptionPerUser: true,
      active: true,
      expiresAt: true,
      maxRedemptions: true,
      totalRedemptions: true,
      createdByUserId: true,
    },
  });

  if (!link) {
    logServerEvent("warn", "disc_promo_invalid_token", { userId: params.userId, promoToken: params.token });
    return { status: "invalid" as const, redemption: null, link: null };
  }

  const linkState = getDiscPromoLinkState(link);
  if (linkState !== "active") {
    logServerEvent("warn", "disc_promo_redeem_blocked", { userId: params.userId, promoLinkId: link.id, linkState });
    return { status: linkState as Exclude<PromoLinkState, "active">, redemption: null, link };
  }

  try {
    const redemption = await prisma.$transaction(async (tx) => {
      const existing = await tx.discPromoRedemption.findFirst({
        where: {
          promoLinkId: link.id,
          userId: params.userId,
        },
        select: {
          id: true,
          grantedCredits: true,
          consumedCredits: true,
        },
      });

      if (existing && link.oneRedemptionPerUser) {
        return { ...existing, isNew: false };
      }

      const refreshed = await tx.discPromoLink.findUniqueOrThrow({
        where: { id: link.id },
        select: { maxRedemptions: true, totalRedemptions: true, active: true, expiresAt: true },
      });

      const refreshedState = getDiscPromoLinkState(refreshed);
      if (refreshedState !== "active") {
        throw new Error(`PROMO_NOT_ACTIVE:${refreshedState}`);
      }

      const created = await tx.discPromoRedemption.create({
        data: {
          promoLinkId: link.id,
          userId: params.userId,
          grantedCredits: link.grantCredits,
        },
        select: {
          id: true,
          grantedCredits: true,
          consumedCredits: true,
        },
      });

      await tx.discPromoLink.update({
        where: { id: link.id },
        data: {
          totalRedemptions: { increment: 1 },
        },
      });

      return { ...created, isNew: true };
    });

    logServerEvent("info", redemption.isNew ? "disc_promo_redeemed" : "disc_promo_redeem_duplicate", {
      userId: params.userId,
      promoLinkId: link.id,
      promoCreatedByUserId: link.createdByUserId,
      grantTier: link.grantTier,
      grantedCredits: redemption.grantedCredits,
      consumedCredits: redemption.consumedCredits,
    });

    return { status: redemption.isNew ? ("redeemed" as const) : ("already_redeemed" as const), redemption, link };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PROMO_NOT_ACTIVE:")) {
      const state = error.message.split(":")[1] as Exclude<PromoLinkState, "active">;
      return { status: state, redemption: null, link };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      logServerEvent("warn", "disc_promo_redeem_collision", { promoLinkId: link.id, userId: params.userId });
    }

    logServerEvent("error", "disc_promo_redeem_failed", { userId: params.userId, promoLinkId: link.id, error });
    return { status: "error" as const, redemption: null, link };
  }
}

export function canPromoGrantTierAccess(grantTier: DiscTierAccess, selectedVersionTier: "free" | "standard" | "deep" | "unknown") {
  if (selectedVersionTier === "unknown") {
    return false;
  }

  if (grantTier === DiscTierAccess.DEEP) {
    return true;
  }

  if (grantTier === DiscTierAccess.STANDARD) {
    return selectedVersionTier === "free" || selectedVersionTier === "standard";
  }

  return selectedVersionTier === "free";
}
