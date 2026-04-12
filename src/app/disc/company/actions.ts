"use server";

import { revalidatePath } from "next/cache";
import { AssessmentInviteStatus } from "@prisma/client";

import { requireUser } from "@/lib/access";
import { isCompanyRecruiter } from "@/lib/company-access";
import { createUniqueAssessmentInviteToken } from "@/lib/disc-invites";
import { prisma } from "@/lib/prisma";

export type CompanyInviteActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialCompanyInviteActionState: CompanyInviteActionState = {
  status: "idle",
  message: "",
};

async function requireCompanyRecruiter(userId: string, companyId: string) {
  const canRecruitForCompany = await isCompanyRecruiter(userId, companyId);

  if (!canRecruitForCompany) {
    throw new Error("Not authorized for this company");
  }
}

export async function createAssessmentInvite(
  _: CompanyInviteActionState,
  formData: FormData,
): Promise<CompanyInviteActionState> {
  try {
    const user = await requireUser();
    const companyId = String(formData.get("companyId") ?? "").trim();

    if (!companyId) {
      return { status: "error", message: "Missing company." };
    }

    await requireCompanyRecruiter(user.id, companyId);

    const candidateName = String(formData.get("candidateName") ?? "").trim() || null;
    const candidateEmail = String(formData.get("candidateEmail") ?? "").trim().toLowerCase() || null;
    const expiresInDaysRaw = Number(formData.get("expiresInDays") ?? 7);
    const expiresInDays = Number.isFinite(expiresInDaysRaw) ? Math.min(Math.max(expiresInDaysRaw, 1), 30) : 7;
    const token = await createUniqueAssessmentInviteToken();

    await prisma.assessmentInvite.create({
      data: {
        token,
        companyId,
        createdByUserId: user.id,
        candidateName,
        candidateEmail,
        status: AssessmentInviteStatus.ACTIVE,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      },
    });

    revalidatePath("/disc/company");

    return { status: "success", message: "Invite created." };
  } catch {
    return { status: "error", message: "Could not create invite." };
  }
}

export async function invalidateAssessmentInvite(
  _: CompanyInviteActionState,
  formData: FormData,
): Promise<CompanyInviteActionState> {
  try {
    const user = await requireUser();
    const inviteId = String(formData.get("inviteId") ?? "").trim();
    const companyId = String(formData.get("companyId") ?? "").trim();

    if (!inviteId || !companyId) {
      return { status: "error", message: "Invalid invite." };
    }

    await requireCompanyRecruiter(user.id, companyId);

    await prisma.assessmentInvite.updateMany({
      where: { id: inviteId, companyId },
      data: { status: AssessmentInviteStatus.INVALIDATED },
    });

    revalidatePath("/disc/company");

    return { status: "success", message: "Invite invalidated." };
  } catch {
    return { status: "error", message: "Could not invalidate invite." };
  }
}
