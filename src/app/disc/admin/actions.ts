"use server";

import { DiscTierAccess } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDiscAdmin } from "@/lib/access";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

function parseTier(value: FormDataEntryValue | null): DiscTierAccess | null {
  if (value === DiscTierAccess.FREE || value === DiscTierAccess.STANDARD || value === DiscTierAccess.DEEP) {
    return value;
  }

  return null;
}

export async function updateUserDiscAccess(formData: FormData) {
  const admin = await requireDiscAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const tier = parseTier(formData.get("tier"));

  if (!userId || !tier) {
    redirect("/disc/admin?status=error");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { discMaxTierOverride: tier },
  });

  logServerEvent("info", "disc_admin_user_access_updated", {
    adminUserId: admin.id,
    userId,
    tier,
  });

  revalidatePath("/disc/admin");
  redirect("/disc/admin?status=user_updated");
}

export async function updateCompanyDiscAccess(formData: FormData) {
  const admin = await requireDiscAdmin();
  const companyId = String(formData.get("companyId") ?? "").trim();
  const tier = parseTier(formData.get("tier"));

  if (!companyId || !tier) {
    redirect("/disc/admin?status=error");
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { discMaxTierAccess: tier },
  });

  logServerEvent("info", "disc_admin_company_access_updated", {
    adminUserId: admin.id,
    companyId,
    tier,
  });

  revalidatePath("/disc/admin");
  redirect("/disc/admin?status=company_updated");
}
