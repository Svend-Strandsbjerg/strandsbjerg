"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { FAMILY_PRIVATE_BASE_PATH } from "@/lib/private-routes";
import { prisma } from "@/lib/prisma";

export async function createFamilyEvent(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

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
      createdById: userId,
      dateOptions: {
        create: dateOptions.map((date) => ({ candidateDate: date })),
      },
    },
  });

  revalidatePath(FAMILY_PRIVATE_BASE_PATH);
}

export async function voteForEvent(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

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
      userId,
      dateOption: {
        eventId,
      },
    },
  });

  await prisma.vote.createMany({
    data: selectedOptions.map((dateOptionId) => ({
      dateOptionId,
      userId,
    })),
    skipDuplicates: true,
  });

  revalidatePath(`${FAMILY_PRIVATE_BASE_PATH}/events/${eventId}`);
  revalidatePath(FAMILY_PRIVATE_BASE_PATH);
}
