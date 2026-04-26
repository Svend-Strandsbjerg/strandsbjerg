import { ApprovalStatus, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const familyUser = await prisma.user.upsert({
    where: { email: "family@example.com" },
    update: {},
    create: {
      email: "family@example.com",
      name: "Family Demo User",
      role: Role.USER,
      approvalStatus: ApprovalStatus.APPROVED,
    },
  });

  const event = await prisma.familyEvent.create({
    data: {
      title: "Sommerweekend",
      description: null,
      location: "Vestkysten",
      shareToken: "demo-share-token-2026",
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
      eventId: event.id,
      participantName: "Familie Demo User",
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
