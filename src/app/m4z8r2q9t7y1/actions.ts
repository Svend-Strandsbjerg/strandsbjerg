"use server";

import { revalidatePath } from "next/cache";

import { requireInvestmentAccessUser } from "@/lib/access";
import { createMarketDataService } from "@/lib/market-data";
import { INVESTMENTS_PRIVATE_BASE_PATH } from "@/lib/private-routes";
import { prisma } from "@/lib/prisma";

function normalizeInputValue(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

export async function createInvestmentPurchase(formData: FormData) {
  const user = await requireInvestmentAccessUser();

  const isin = normalizeInputValue(formData, "isin").toUpperCase();
  const securityName = normalizeInputValue(formData, "securityName");
  const transactedOnRaw = normalizeInputValue(formData, "purchaseDate");
  const currency = normalizeInputValue(formData, "currency").toUpperCase();
  const quantityRaw = Number(formData.get("quantity") ?? 0);
  const priceRaw = Number(formData.get("purchasePrice") ?? 0);
  const notesRaw = normalizeInputValue(formData, "notes");

  if (!isin || !currency) {
    throw new Error("ISIN og valuta er påkrævet.");
  }

  const purchaseDate = new Date(transactedOnRaw);

  if (Number.isNaN(purchaseDate.getTime()) || Number.isNaN(quantityRaw) || quantityRaw <= 0 || Number.isNaN(priceRaw) || priceRaw <= 0) {
    throw new Error("Ugyldige købsdata.");
  }

  const marketDataService = createMarketDataService();
  const marketSecurity = await marketDataService.resolveSecurity({
    isin,
    securityName,
    currency,
  });

  const security = await prisma.security.upsert({
    where: {
      createdById_isin: {
        createdById: user.id,
        isin,
      },
    },
    update: {
      name: marketSecurity?.name || securityName || isin,
      currency: marketSecurity?.currency || currency,
      source: marketSecurity ? `Market data (${marketSecurity.provider})` : "Manual entry",
    },
    create: {
      isin,
      code: marketSecurity?.symbol || isin,
      name: marketSecurity?.name || securityName || isin,
      type: "OTHER",
      currency: marketSecurity?.currency || currency,
      provider: marketSecurity?.provider || "UNCONFIGURED",
      source: marketSecurity ? `Market data (${marketSecurity.provider})` : "Manual entry",
      createdById: user.id,
    },
  });

  await prisma.investmentTransaction.create({
    data: {
      securityId: security.id,
      type: "BUY",
      transactedOn: purchaseDate,
      quantity: quantityRaw,
      price: priceRaw,
      notes: notesRaw || null,
      createdById: user.id,
    },
  });

  revalidatePath(INVESTMENTS_PRIVATE_BASE_PATH);
}

export async function saveManualPrice(formData: FormData) {
  const user = await requireInvestmentAccessUser();

  const securityId = normalizeInputValue(formData, "securityId");
  const priceRaw = Number(formData.get("manualPrice") ?? 0);
  const currency = normalizeInputValue(formData, "currency").toUpperCase();
  const pricedAtRaw = normalizeInputValue(formData, "pricedAt");
  const notes = normalizeInputValue(formData, "notes");

  const pricedAt = new Date(pricedAtRaw);

  if (!securityId || Number.isNaN(priceRaw) || priceRaw <= 0 || !currency || Number.isNaN(pricedAt.getTime())) {
    throw new Error("Ugyldig manuel kurs.");
  }

  const security = await prisma.security.findFirst({
    where: {
      id: securityId,
      createdById: user.id,
    },
    select: { id: true },
  });

  if (!security) {
    throw new Error("Papiret blev ikke fundet.");
  }

  await prisma.manualSecurityPrice.upsert({
    where: {
      createdById_securityId: {
        createdById: user.id,
        securityId,
      },
    },
    update: {
      price: priceRaw,
      currency,
      pricedAt,
      notes: notes || null,
    },
    create: {
      securityId,
      price: priceRaw,
      currency,
      pricedAt,
      notes: notes || null,
      createdById: user.id,
    },
  });

  revalidatePath(INVESTMENTS_PRIVATE_BASE_PATH);
}
