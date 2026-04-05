"use server";

import { ApprovalStatus, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SignupActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSignupActionState: SignupActionState = {
  status: "idle",
  message: "",
};

export async function registerUser(_: SignupActionState, formData: FormData): Promise<SignupActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  try {
    await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
      },
      create: {
        email,
        name: name || null,
        role: Role.USER,
        approvalStatus: ApprovalStatus.PENDING,
      },
    });

    return {
      status: "success",
      message: "Your account is awaiting approval",
    };
  } catch {
    return {
      status: "error",
      message: "Could not complete sign-up. Please try again.",
    };
  }
}
