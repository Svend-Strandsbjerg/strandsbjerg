"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyAccessUser } from "@/lib/access";
import { createFamilyShareToken, ensureDateOptionsMatchEvent, normalizeParticipantName } from "@/lib/family-votes";
import { FAMILY_PRIVATE_BASE_PATH, FAMILY_PUBLIC_VOTE_BASE_PATH } from "@/lib/private-routes";
import { prisma } from "@/lib/prisma";

export async function createFamilyEvent(formData: FormData) {
  const user = await requireFamilyAccessUser();

  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const dateOptions = formData
    .getAll("dateOptions")
    .map((value) => String(value))
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  if (!title || dateOptions.length === 0) {
    throw new Error("Invalid event payload");
  }

  await prisma.familyEvent.create({
    data: {
      title,
      description: null,
      location: location || null,
      shareToken: createFamilyShareToken(),
      createdById: user.id,
      dateOptions: {
        create: dateOptions.map((candidateDate) => ({ candidateDate })),
      },
    },
  });

  revalidatePath(FAMILY_PRIVATE_BASE_PATH);
}

export async function submitFamilyPublicVote(formData: FormData) {
  const shareToken = String(formData.get("shareToken") ?? "").trim();
  const participantName = normalizeParticipantName(String(formData.get("participantName") ?? ""));
  const selectedOptions = formData
    .getAll("dateOptionIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!shareToken || !participantName || selectedOptions.length === 0) {
    throw new Error("Missing vote selection");
  }

  const event = await prisma.familyEvent.findUnique({
    where: { shareToken },
    select: { id: true },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const matchingOptionCount = await prisma.eventDateOption.count({
    where: {
      eventId: event.id,
      id: {
        in: selectedOptions,
      },
    },
  });

  ensureDateOptionsMatchEvent({
    selectedOptionCount: selectedOptions.length,
    matchingOptionCount,
  });

  await prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany({
      where: {
        eventId: event.id,
        participantName,
      },
    });

    await tx.vote.createMany({
      data: selectedOptions.map((dateOptionId) => ({
        eventId: event.id,
        dateOptionId,
        participantName,
      })),
      skipDuplicates: true,
    });
  });

  revalidatePath(FAMILY_PRIVATE_BASE_PATH);
  revalidatePath(`${FAMILY_PRIVATE_BASE_PATH}/events/${event.id}`);
  revalidatePath(`${FAMILY_PUBLIC_VOTE_BASE_PATH}/${shareToken}`);
}
