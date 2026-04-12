"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { AssessmentInviteStatus } from "@prisma/client";

import { requireUser } from "@/lib/access";
import { isCompanyRecruiter } from "@/lib/company-access";
import { sendDiscEmail } from "@/lib/disc-email";
import { createUniqueAssessmentInviteToken, getInviteAccessState } from "@/lib/disc-invites";
import { buildResultLink, ensureAssessmentResultShare } from "@/lib/disc-result-share";
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

async function inferOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  return `${protocol}://${host}`;
}

function isChecked(formValue: FormDataEntryValue | null) {
  return formValue === "on" || formValue === "true";
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
    const sendInviteEmail = isChecked(formData.get("sendInviteEmail"));
    if (sendInviteEmail && !candidateEmail) {
      return { status: "error", message: "Candidate email is required when sending an invite email." };
    }

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

    if (sendInviteEmail && candidateEmail) {
      const origin = await inferOrigin();
      const inviteLink = `${origin}/disc/invite/${token}`;

      await sendDiscEmail({
        to: candidateEmail,
        subject: "Your DISC assessment invite",
        text: `Hello${candidateName ? ` ${candidateName}` : ""},\n\nYou have been invited to complete a DISC assessment.\n\nOpen your secure invite link:\n${inviteLink}\n\nThis link expires in ${expiresInDays} day(s).`,
      });
    }

    revalidatePath("/disc/company");

    return { status: "success", message: sendInviteEmail ? "Invite created and email sent." : "Invite created." };
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

export async function resendAssessmentResultEmail(
  _: CompanyInviteActionState,
  formData: FormData,
): Promise<CompanyInviteActionState> {
  try {
    const user = await requireUser();
    const companyId = String(formData.get("companyId") ?? "").trim();
    const assessmentId = String(formData.get("assessmentId") ?? "").trim();

    if (!companyId || !assessmentId) {
      return { status: "error", message: "Invalid assessment request." };
    }

    await requireCompanyRecruiter(user.id, companyId);

    const assessment = await prisma.discAssessment.findFirst({
      where: {
        id: assessmentId,
        companyId,
        status: "SUBMITTED",
      },
      select: {
        id: true,
        candidateName: true,
        candidateEmail: true,
      },
    });

    if (!assessment) {
      return { status: "error", message: "Assessment not found." };
    }

    if (!assessment.candidateEmail) {
      return { status: "error", message: "Candidate email is missing for this assessment." };
    }

    const share = await ensureAssessmentResultShare(assessment.id);
    const origin = await inferOrigin();
    const resultLink = buildResultLink(origin, share.token);

    await sendDiscEmail({
      to: assessment.candidateEmail,
      subject: "Your DISC assessment result",
      text: `Hello${assessment.candidateName ? ` ${assessment.candidateName}` : ""},\n\nYour DISC assessment result is available here:\n${resultLink}\n\nThis secure link gives view-only access to your completed result.`,
    });

    return { status: "success", message: "Result email sent." };
  } catch {
    return { status: "error", message: "Could not send result email." };
  }
}

export async function resendAssessmentInviteEmail(
  _: CompanyInviteActionState,
  formData: FormData,
): Promise<CompanyInviteActionState> {
  try {
    const user = await requireUser();
    const companyId = String(formData.get("companyId") ?? "").trim();
    const inviteId = String(formData.get("inviteId") ?? "").trim();

    if (!companyId || !inviteId) {
      return { status: "error", message: "Invalid invite request." };
    }

    await requireCompanyRecruiter(user.id, companyId);

    const invite = await prisma.assessmentInvite.findFirst({
      where: {
        id: inviteId,
        companyId,
      },
      select: {
        token: true,
        candidateName: true,
        candidateEmail: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invite) {
      return { status: "error", message: "Invite not found." };
    }

    if (!invite.candidateEmail) {
      return { status: "error", message: "Candidate email is missing for this invite." };
    }

    const inviteState = getInviteAccessState(invite.status, invite.expiresAt);
    if (inviteState !== "active") {
      return { status: "error", message: "Only active invites can be re-sent." };
    }

    const origin = await inferOrigin();
    const inviteLink = `${origin}/disc/invite/${invite.token}`;

    await sendDiscEmail({
      to: invite.candidateEmail,
      subject: "Reminder: your DISC assessment invite",
      text: `Hello${invite.candidateName ? ` ${invite.candidateName}` : ""},\n\nThis is a reminder to complete your DISC assessment.\n\nOpen your secure invite link:\n${inviteLink}\n\nThis link expires on ${invite.expiresAt.toISOString().slice(0, 10)}.`,
    });

    return { status: "success", message: "Invite email sent." };
  } catch {
    return { status: "error", message: "Could not resend invite email." };
  }
}
