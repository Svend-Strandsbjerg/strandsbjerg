"use server";

import { ApprovalStatus, DiscTierAccess, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserAdmin } from "@/lib/access";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true";
}

function parseApprovalStatus(value: FormDataEntryValue | null): ApprovalStatus | null {
  if (value === ApprovalStatus.APPROVED || value === ApprovalStatus.PENDING || value === ApprovalStatus.REJECTED) {
    return value;
  }

  return null;
}

function parseRole(value: FormDataEntryValue | null): Role | null {
  if (value === Role.ADMIN || value === Role.USER) {
    return value;
  }

  return null;
}

function parseTier(value: FormDataEntryValue | null): DiscTierAccess | null {
  if (value === DiscTierAccess.FREE || value === DiscTierAccess.STANDARD || value === DiscTierAccess.DEEP) {
    return value;
  }

  return null;
}

export async function updateUserPermissions(formData: FormData) {
  await requireUserAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const role = parseRole(formData.get("role"));
  const approvalStatus = parseApprovalStatus(formData.get("approvalStatus"));
  const discMaxTierOverride = parseTier(formData.get("discMaxTierOverride"));

  if (!userId || !role || !approvalStatus || !discMaxTierOverride) {
    redirect("/admin/users?status=error");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      approvalStatus,
      isSiteAdmin: parseBoolean(formData.get("isSiteAdmin")),
      isDiscAdmin: parseBoolean(formData.get("isDiscAdmin")),
      discMaxTierOverride,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/disc");
  revalidatePath("/admin/site");
  revalidatePath("/disc/admin");

  redirect("/admin/users?status=updated");
}

export async function setUserPassword(formData: FormData) {
  await requireUserAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!userId || newPassword.length < 8 || newPassword !== confirmPassword) {
    redirect("/admin/users?status=password_error");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?status=password_updated");
}
