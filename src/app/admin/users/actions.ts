"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true";
}

export async function setDiscAdminAccess(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const makeDiscAdmin = parseBoolean(formData.get("makeDiscAdmin"));

  if (!userId) {
    redirect("/admin/users?status=error");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isDiscAdmin: makeDiscAdmin },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/disc");
  revalidatePath("/disc/admin");
  redirect(`/admin/users?status=${makeDiscAdmin ? "disc_admin_granted" : "disc_admin_removed"}`);
}
