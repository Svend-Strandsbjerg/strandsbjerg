"use server";

import { revalidatePath } from "next/cache";

import { requireSiteAdmin } from "@/lib/access";
import { defaultHomeContent, defaultProfessionalContent, type ProfessionalPageContent } from "@/lib/content";
import { prisma } from "@/lib/prisma";

import type { AdminActionState } from "@/app/admin/action-state";

function linesToList(raw: FormDataEntryValue | null, fallback: string[]) {
  const lines = String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : fallback;
}

export async function saveHomeContent(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireSiteAdmin();

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
      return { status: "error", message: "Database-klienten er ikke opdateret. Kør prisma generate og genstart serveren." };
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
    revalidatePath("/admin/site");

    return { status: "success", message: "Forsideindhold er gemt." };
  } catch {
    return { status: "error", message: "Kunne ikke gemme forsideindhold. Prøv igen." };
  }
}

export async function saveProfessionalContent(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireSiteAdmin();

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
      return { status: "error", message: "Database-klienten er ikke opdateret. Kør prisma generate og genstart serveren." };
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
    revalidatePath("/admin/site");

    return { status: "success", message: "Indhold for professionel side er gemt." };
  } catch {
    return { status: "error", message: "Kunne ikke gemme indhold for professionel side. Prøv igen." };
  }
}
