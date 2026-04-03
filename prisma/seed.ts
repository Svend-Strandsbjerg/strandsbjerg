import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const familyUser = await prisma.user.upsert({
    where: { email: "family@example.com" },
    update: {},
    create: {
      email: "family@example.com",
      name: "Family Demo User",
      role: Role.FAMILY,
    },
  });

  const event = await prisma.familyEvent.create({
    data: {
      title: "Summer weekend planning",
      description: "Let us pick the best weekend for a family getaway.",
      location: "West Coast",
      createdById: familyUser.id,
      dateOptions: {
        create: [
          { candidateDate: new Date("2026-06-13T10:00:00.000Z") },
          { candidateDate: new Date("2026-06-20T10:00:00.000Z") },
          { candidateDate: new Date("2026-06-27T10:00:00.000Z") },
        ],
      },
    },
  });

  await prisma.vote.create({
    data: {
      userId: familyUser.id,
      dateOptionId: (await prisma.eventDateOption.findFirstOrThrow({ where: { eventId: event.id } })).id,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
