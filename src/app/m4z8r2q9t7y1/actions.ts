"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/access";
import { INVESTMENTS_PRIVATE_BASE_PATH } from "@/lib/private-routes";
import { prisma } from "@/lib/prisma";

export async function createInvestmentEntry(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const amountRaw = Number(formData.get("amount") ?? 0);
  const investedOnRaw = String(formData.get("investedOn") ?? "");
  const investedOn = new Date(investedOnRaw);

  if (!name || !type || Number.isNaN(amountRaw) || amountRaw <= 0 || Number.isNaN(investedOn.getTime())) {
    throw new Error("Invalid investment entry");
  }

  await prisma.investmentEntry.create({
    data: {
      name,
      type,
      amount: amountRaw,
      investedOn,
      createdById: user.id,
    },
  });

  revalidatePath(INVESTMENTS_PRIVATE_BASE_PATH);
}
