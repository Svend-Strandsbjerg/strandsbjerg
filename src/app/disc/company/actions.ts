"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { AssessmentInviteStatus } from "@prisma/client";

import { requireUser } from "@/lib/access";
import { canCreateCompanyProfile, canManageCompany } from "@/lib/company-access";
import { type CompanyInviteActionState } from "@/app/disc/company/action-state";
import { sendDiscEmail } from "@/lib/disc-email";
import { createUniqueAssessmentInviteToken, getInviteAccessState, isActiveInviteUniqueConstraintError } from "@/lib/disc-invites";
import { logServerEvent } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildResultLink, ensureAssessmentResultShare } from "@/lib/disc-result-share";
import { prisma } from "@/lib/prisma";


async function requireCompanyAdmin(userId: string, companyId: string) {
  const canManage = await canManageCompany(userId, companyId);

  if (!canManage) {
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
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "").trim();

  if (!companyId) {
    return { status: "error", message: "Missing company." };
  }

  const createRateLimit = enforceRateLimit({
    key: `invite-create:${user.id}:${companyId}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!createRateLimit.ok) {
    return { status: "error", message: "Too many invite creations. Please wait before trying again." };
  }

  try {
    await requireCompanyAdmin(user.id, companyId);

    const candidateName = String(formData.get("candidateName") ?? "").trim() || null;
    const candidateEmail = String(formData.get("candidateEmail") ?? "").trim().toLowerCase() || null;
    const expiresInDaysRaw = Number(formData.get("expiresInDays") ?? 7);
    const expiresInDays = Number.isFinite(expiresInDaysRaw) ? Math.min(Math.max(expiresInDaysRaw, 1), 30) : 7;
    const sendInviteEmail = isChecked(formData.get("sendInviteEmail"));

    if (sendInviteEmail && !candidateEmail) {
      return { status: "error", message: "Candidate email is required when sending an invite email." };
    }

    if (candidateEmail) {
      const existingActiveInvite = await prisma.assessmentInvite.findFirst({
        where: {
          companyId,
          candidateEmail,
          status: AssessmentInviteStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      if (existingActiveInvite) {
        return { status: "error", message: "An active invite already exists for this candidate email." };
      }
    }

    const token = await createUniqueAssessmentInviteToken();

    const createdInvite = await prisma.assessmentInvite.create({
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

    const totalCompanyInvites = await prisma.assessmentInvite.count({
      where: { companyId },
    });

    if (totalCompanyInvites === 1) {
      logServerEvent("info", "disc_beta_first_invite_created", {
        companyId,
        inviteId: createdInvite.id,
        createdByUserId: user.id,
      });
    }

    if (sendInviteEmail && candidateEmail) {
      const origin = await inferOrigin();
      const inviteLink = `${origin}/disc/invite/${token}`;

      try {
        await sendDiscEmail({
          to: candidateEmail,
          subject: "Your DISC assessment invite",
          text: `Hello${candidateName ? ` ${candidateName}` : ""},\n\nYou have been invited to complete a DISC assessment.\n\nOpen your secure invite link:\n${inviteLink}\n\nThis link expires in ${expiresInDays} day(s).`,
        });
        logServerEvent("info", "disc_invite_email_sent", {
          companyId,
          inviteId: createdInvite.id,
          candidateEmail,
          sendType: "initial",
        });
      } catch (error) {
        logServerEvent("error", "disc_invite_email_send_failed", {
          companyId,
          userId: user.id,
          inviteType: "initial",
          error,
        });

        return { status: "error", message: "Invite created, but email delivery failed. You can copy and send the link manually." };
      }
    }

    revalidatePath("/disc/company");

    return { status: "success", message: sendInviteEmail ? "Invite created and email sent." : "Invite created." };
  } catch (error) {
    if (isActiveInviteUniqueConstraintError(error)) {
      return { status: "error", message: "An active invite already exists for this candidate email." };
    }

    logServerEvent("error", "disc_invite_create_failed", {
      companyId,
      userId: user.id,
      error,
    });
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

    await requireCompanyAdmin(user.id, companyId);

    await prisma.assessmentInvite.updateMany({
      where: { id: inviteId, companyId },
      data: { status: AssessmentInviteStatus.INVALIDATED },
    });

    revalidatePath("/disc/company");

    return { status: "success", message: "Invite invalidated." };
  } catch (error) {
    logServerEvent("error", "disc_invite_invalidate_failed", { error });
    return { status: "error", message: "Could not invalidate invite." };
  }
}

export async function resendAssessmentResultEmail(
  _: CompanyInviteActionState,
  formData: FormData,
): Promise<CompanyInviteActionState> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "").trim();
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();

  if (!companyId || !assessmentId) {
    return { status: "error", message: "Invalid assessment request." };
  }

  const rateLimit = enforceRateLimit({
    key: `result-email:${user.id}:${assessmentId}`,
    limit: 2,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return { status: "error", message: "Please wait before resending this result email again." };
  }

  try {
    await requireCompanyAdmin(user.id, companyId);

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

    logServerEvent("info", "disc_result_email_sent", {
      companyId,
      assessmentId,
      candidateEmail: assessment.candidateEmail,
    });

    return { status: "success", message: "Result email sent." };
  } catch (error) {
    logServerEvent("error", "disc_result_email_send_failed", {
      companyId,
      assessmentId,
      userId: user.id,
      error,
    });
    return { status: "error", message: "Could not send result email." };
  }
}

export async function resendAssessmentInviteEmail(
  _: CompanyInviteActionState,
  formData: FormData,
): Promise<CompanyInviteActionState> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "").trim();
  const inviteId = String(formData.get("inviteId") ?? "").trim();

  if (!companyId || !inviteId) {
    return { status: "error", message: "Invalid invite request." };
  }

  const rateLimit = enforceRateLimit({
    key: `invite-email:${user.id}:${inviteId}`,
    limit: 2,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return { status: "error", message: "Please wait before sending this invite email again." };
  }

  try {
    await requireCompanyAdmin(user.id, companyId);

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

    logServerEvent("info", "disc_invite_email_sent", {
      companyId,
      inviteId,
      candidateEmail: invite.candidateEmail,
      sendType: "resend",
    });

    return { status: "success", message: "Invite email sent." };
  } catch (error) {
    logServerEvent("error", "disc_invite_email_send_failed", {
      companyId,
      inviteId,
      userId: user.id,
      inviteType: "resend",
      error,
    });
    return { status: "error", message: "Could not resend invite email." };
  }
}

export async function createCompanyProfile(
  _: CompanyInviteActionState,
  formData: FormData,
): Promise<CompanyInviteActionState> {
  const user = await requireUser();
  const mayCreateCompany = await canCreateCompanyProfile(user.id, user.role);

  if (!mayCreateCompany) {
    return { status: "error", message: "You are not allowed to create a company profile." };
  }

  const companyName = String(formData.get("companyName") ?? "").trim();

  if (!companyName || companyName.length < 2) {
    return { status: "error", message: "Company name must be at least 2 characters." };
  }

  try {
    const company = await prisma.company.create({
      data: {
        name: companyName,
        memberships: {
          create: {
            userId: user.id,
            role: "COMPANY_ADMIN",
          },
        },
      },
      select: { id: true },
    });

    logServerEvent("info", "disc_company_profile_created", {
      companyId: company.id,
      createdByUserId: user.id,
    });

    revalidatePath("/disc/company");
    return { status: "success", message: "Company profile created." };
  } catch (error) {
    logServerEvent("error", "disc_company_profile_create_failed", {
      userId: user.id,
      error,
    });
    return { status: "error", message: "Could not create company profile." };
  }
}
