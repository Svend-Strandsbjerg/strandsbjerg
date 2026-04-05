"use server";

import { revalidatePath } from "next/cache";
import { ApprovalStatus, Role } from "@prisma/client";

import { requireAdmin } from "@/lib/access";
import { defaultHomeContent, defaultProfessionalContent, type ProfessionalPageContent } from "@/lib/content";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialAdminActionState: AdminActionState = {
  status: "idle",
  message: "",
};

function linesToList(raw: FormDataEntryValue | null, fallback: string[]) {
  const lines = String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : fallback;
}

export async function saveHomeContent(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();

    const homePageContent = (prisma as unknown as Record<string, unknown>).homePageContent as
      | {
          upsert: (args: {
            where: { singleton: string };
            create: { singleton: string; headline: string; intro: string; sections: string[] };
            update: { headline: string; intro: string; sections: string[] };
          }) => Promise<unknown>;
        }
      | undefined;

    if (!homePageContent) {
      return { status: "error", message: "Database client is out of date. Run prisma generate and restart the server." };
    }

    const headline = String(formData.get("headline") ?? "").trim() || defaultHomeContent.headline;
    const intro = String(formData.get("intro") ?? "").trim() || defaultHomeContent.intro;
    const sections = linesToList(formData.get("sections"), defaultHomeContent.sections);

    await homePageContent.upsert({
      where: { singleton: "home" },
      create: { singleton: "home", headline, intro, sections },
      update: { headline, intro, sections },
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return { status: "success", message: "Home page content saved." };
  } catch {
    return { status: "error", message: "Could not save home page content. Please try again." };
  }
}

export async function saveProfessionalContent(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();

    const professionalPageContent = (prisma as unknown as Record<string, unknown>).professionalPageContent as
      | {
          upsert: (args: {
            where: { singleton: string };
            create: {
              singleton: string;
              heroTitle: string;
              heroIntro: string;
              competencies: string[];
              experienceHighlights: string[];
              focusAreas: ProfessionalPageContent["focusAreas"];
            };
            update: {
              heroTitle: string;
              heroIntro: string;
              competencies: string[];
              experienceHighlights: string[];
              focusAreas: ProfessionalPageContent["focusAreas"];
            };
          }) => Promise<unknown>;
        }
      | undefined;

    if (!professionalPageContent) {
      return { status: "error", message: "Database client is out of date. Run prisma generate and restart the server." };
    }

    const heroTitle = String(formData.get("heroTitle") ?? "").trim() || defaultProfessionalContent.heroTitle;
    const heroIntro = String(formData.get("heroIntro") ?? "").trim() || defaultProfessionalContent.heroIntro;
    const competencies = linesToList(formData.get("competencies"), defaultProfessionalContent.competencies);
    const experienceHighlights = linesToList(formData.get("experienceHighlights"), defaultProfessionalContent.experienceHighlights);

    const focusTitles = formData.getAll("focusTitle").map((entry) => String(entry).trim());
    const focusBodies = formData.getAll("focusBody").map((entry) => String(entry).trim());

    const focusAreas = focusTitles
      .map((title, index) => ({ title, body: focusBodies[index] ?? "" }))
      .filter((entry) => entry.title && entry.body);

    await professionalPageContent.upsert({
      where: { singleton: "professional" },
      create: {
        singleton: "professional",
        heroTitle,
        heroIntro,
        competencies,
        experienceHighlights,
        focusAreas: focusAreas.length > 0 ? focusAreas : defaultProfessionalContent.focusAreas,
      },
      update: {
        heroTitle,
        heroIntro,
        competencies,
        experienceHighlights,
        focusAreas: focusAreas.length > 0 ? focusAreas : defaultProfessionalContent.focusAreas,
      },
    });

    revalidatePath("/professional");
    revalidatePath("/admin");

    return { status: "success", message: "Professional page content saved." };
  } catch {
    return { status: "error", message: "Could not save professional content. Please try again." };
  }
}

export async function setUserApprovalStatus(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();

    const userId = String(formData.get("userId") ?? "");
    const status = String(formData.get("approvalStatus") ?? "");

    if (!userId || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return { status: "error", message: "Invalid approval update request." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: status as ApprovalStatus },
    });

    revalidatePath("/admin");

    return { status: "success", message: "User approval status updated." };
  } catch {
    return { status: "error", message: "Could not update user approval status." };
  }
}

export async function setUserRole(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();

    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "");

    if (!userId || !["ADMIN", "FAMILY", "USER"].includes(role)) {
      return { status: "error", message: "Invalid role assignment request." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    });

    revalidatePath("/admin");

    return { status: "success", message: "User role updated." };
  } catch {
    return { status: "error", message: "Could not update user role." };
  }
}


export async function setUserPassword(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();

    const userId = String(formData.get("userId") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!userId) {
      return { status: "error", message: "Invalid password update request." };
    }

    if (newPassword.length < 8) {
      return { status: "error", message: "Password must be at least 8 characters long." };
    }

    if (newPassword !== confirmPassword) {
      return { status: "error", message: "Password confirmation does not match." };
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    revalidatePath("/admin");

    return { status: "success", message: "New password saved." };
  } catch {
    return { status: "error", message: "Could not set a new password." };
  }
}
