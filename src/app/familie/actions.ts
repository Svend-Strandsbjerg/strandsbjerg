"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createFamilyEvent(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const dateOptions = formData
    .getAll("dateOptions")
    .map((value) => String(value))
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  if (title.length < 3 || description.length < 10 || dateOptions.length === 0) {
    throw new Error("Invalid event payload");
  }

  await prisma.familyEvent.create({
    data: {
      title,
      description,
      location: location || null,
      createdById: session.user.id,
      dateOptions: {
        create: dateOptions.map((date) => ({ candidateDate: date })),
      },
    },
  });

  revalidatePath("/familie");
}

export async function voteForEvent(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const eventId = String(formData.get("eventId") ?? "");
  const selectedOptions = formData
    .getAll("dateOptionIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!eventId || selectedOptions.length === 0) {
    throw new Error("Missing vote selection");
  }

  await prisma.vote.deleteMany({
    where: {
      userId: session.user.id,
      dateOption: {
        eventId,
      },
    },
  });

  await prisma.vote.createMany({
    data: selectedOptions.map((dateOptionId) => ({
      dateOptionId,
      userId: session.user.id,
    })),
    skipDuplicates: true,
  });

  revalidatePath(`/familie/events/${eventId}`);
  revalidatePath("/familie");
}
