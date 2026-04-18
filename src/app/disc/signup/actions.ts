"use server";

import { ApprovalStatus, Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { persistDiscInviteContext } from "@/lib/disc-invite-context";
import { persistDiscPromoTokenContext } from "@/lib/disc-promo-context";
import { logServerEvent } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type DiscSignupActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialDiscSignupActionState: DiscSignupActionState = {
  status: "idle",
  message: "",
};

export async function registerDiscUser(_: DiscSignupActionState, formData: FormData): Promise<DiscSignupActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/disc/overview");
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/disc/overview";
  const inviteToken = String(formData.get("invite") ?? "").trim();
  const promoToken = String(formData.get("promo") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Indtast en gyldig e-mailadresse." };
  }

  if (password.length < 8) {
    return { status: "error", message: "Adgangskoden skal være mindst 8 tegn." };
  }

  try {
    const passwordHash = await hashPassword(password);

    await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        passwordHash,
        approvalStatus: ApprovalStatus.APPROVED,
        passwordChangedAt: new Date(),
      },
      create: {
        email,
        name: name || null,
        passwordHash,
        role: Role.USER,
        approvalStatus: ApprovalStatus.APPROVED,
        passwordChangedAt: new Date(),
      },
    });

    if (inviteToken) {
      await persistDiscInviteContext(inviteToken);
    }
    if (promoToken) {
      await persistDiscPromoTokenContext(promoToken);
      logServerEvent("info", "disc_promo_auth_redirect_context_ready", {
        promoToken,
        flow: "signup_submit",
      });
    }

    await signIn("credentials", {
      email,
      password,
      redirectTo: safeNextPath,
    });

    redirect(safeNextPath as never);
  } catch {
    return {
      status: "error",
      message: "Kunne ikke oprette konto lige nu. Prøv igen.",
    };
  }
}
