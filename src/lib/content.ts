import { prisma } from "@/lib/prisma";

export type HomePageContent = {
  headline: string;
  intro: string;
  sections: string[];
};

export type ProfessionalPageContent = {
  heroTitle: string;
  heroIntro: string;
  competencies: string[];
  experienceHighlights: string[];
  focusAreas: Array<{ title: string; body: string }>;
};

export const defaultHomeContent: HomePageContent = {
  headline: "Software solutions engineered for integration, maintainability, and long-term reliability.",
  intro:
    "I build and modernize business-critical systems where technical quality directly impacts performance. My focus is dependable integration, maintainable codebases, and architectural clarity that scales.",
  sections: [
    "Enterprise-grade software delivery with clean, testable implementation",
    "Architecture decisions that reduce complexity and future change cost",
    "Reliable integration across core systems and business platforms",
    "Maintainability as a non-negotiable quality attribute",
    "Technical leadership through clear standards and pragmatic execution",
    "Strong alignment between business outcomes and engineering design",
  ],
};

export const defaultProfessionalContent: ProfessionalPageContent = {
  heroTitle: "Software expertise shaped by architectural thinking",
  heroIntro:
    "I help organizations improve software landscapes without compromising reliability. My work combines hands-on delivery with architectural discipline to create systems that stay stable, maintainable, and easier to evolve.",
  competencies: [
    "Software engineering for complex, business-critical process flows",
    "Architecture design with explicit tradeoffs and maintainability focus",
    "Integration strategy for stable system-to-platform communication",
    "Quality-driven development standards for long-term delivery performance",
  ],
  experienceHighlights: [
    "Led modernization workstreams that improved release confidence while reducing defect carryover from legacy code.",
    "Defined integration contracts and error-handling patterns that increased operational stability across system boundaries.",
    "Established practical code quality and review standards that improved maintainability and onboarding speed in delivery teams.",
  ],
  focusAreas: [
    {
      title: "Approach to software development",
      body: "I prioritize clarity and consistency over short-term shortcuts. Code should be easy to reason about, safe to change, and resilient in production.",
    },
    {
      title: "Approach to architecture",
      body: "I treat architecture as a delivery enabler: clear boundaries, deliberate coupling, and decisions that hold up under evolving requirements.",
    },
    {
      title: "Integration and reliability",
      body: "I design integration flows for transparency and control, with clear contracts, failure handling, and predictable operational behavior.",
    },
    {
      title: "Technical leadership",
      body: "I align engineers, stakeholders, and delivery goals by translating technical complexity into clear priorities and actionable decisions.",
    },
  ],
};

export async function getHomeContent() {
  const entry = await prisma.homePageContent.findUnique({ where: { singleton: "home" } });

  if (!entry) {
    return defaultHomeContent;
  }

  return {
    headline: entry.headline,
    intro: entry.intro,
    sections: entry.sections,
  } satisfies HomePageContent;
}

export async function getProfessionalContent() {
  const entry = await prisma.professionalPageContent.findUnique({ where: { singleton: "professional" } });

  if (!entry) {
    return defaultProfessionalContent;
  }

  return {
    heroTitle: entry.heroTitle,
    heroIntro: entry.heroIntro,
    competencies: entry.competencies,
    experienceHighlights: entry.experienceHighlights,
    focusAreas: entry.focusAreas as ProfessionalPageContent["focusAreas"],
  } satisfies ProfessionalPageContent;
}
