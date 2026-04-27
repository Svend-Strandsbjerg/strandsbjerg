"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/access";
import { verifyPassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

import type { AccountActionState } from "@/app/account/action-state";

export async function updateMyProfile(_: AccountActionState, formData: FormData): Promise<AccountActionState> {
  try {
    const user = await requireUser();
    const name = String(formData.get("name") ?? "").trim();

    await prisma.user.update({
      where: { id: user.id },
      data: { name: name || null },
    });

    revalidatePath("/account");

    return { status: "success", message: "Dine oplysninger er opdateret." };
  } catch {
    return { status: "error", message: "Vi kunne ikke gemme dine ændringer. Prøv igen." };
  }
}

export async function changeMyPassword(_: AccountActionState, formData: FormData): Promise<AccountActionState> {
  try {
    const sessionUser = await requireUser();
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      return { status: "error", message: "Password must be at least 8 characters long." };
    }

    if (newPassword !== confirmPassword) {
      return { status: "error", message: "Password confirmation does not match." };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true },
    });

    if (!dbUser) {
      return { status: "error", message: "User not found." };
    }

    if (dbUser.passwordHash) {
      const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);

      if (!isCurrentValid) {
        return { status: "error", message: "Current password is not correct." };
      }
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    revalidatePath("/account");
    revalidatePath("/admin");

    return { status: "success", message: "Password changed successfully." };
  } catch {
    return { status: "error", message: "Could not change password." };
  }
}
