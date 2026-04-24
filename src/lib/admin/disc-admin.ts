import { getDiscVersionDiscoveryDiagnostics } from "@/lib/disc-engine";
import { prisma } from "@/lib/prisma";

export function getSingleParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function getDiscAdminDashboardData(query: string) {
  const [users, companies, diagnostics] = await Promise.all([
    prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        discMaxTierOverride: true,
      },
    }),
    prisma.company.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        discMaxTierAccess: true,
      },
    }),
    getDiscVersionDiscoveryDiagnostics().catch(() => null),
  ]);

  return { users, companies, diagnostics };
}
