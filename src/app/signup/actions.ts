"use server";

import { ApprovalStatus, Role } from "@prisma/client";

import type { SignupActionState } from "@/app/signup/state";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function registerUser(_: SignupActionState, formData: FormData): Promise<SignupActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  if (password.length < 8) {
    return { status: "error", message: "Password must be at least 8 characters long." };
  }

  try {
    const passwordHash = await hashPassword(password);

    await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        passwordHash,
        passwordChangedAt: new Date(),
      },
      create: {
        email,
        name: name || null,
        passwordHash,
        role: Role.USER,
        approvalStatus: ApprovalStatus.PENDING,
        passwordChangedAt: new Date(),
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
