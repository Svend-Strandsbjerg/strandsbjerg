"use server";

import { Prisma, SecurityType, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireInvestmentAccessUser } from "@/lib/access";
import { INVESTMENTS_PRIVATE_BASE_PATH } from "@/lib/private-routes";
import { prisma } from "@/lib/prisma";

function normalizeEnumInput<T extends string>(value: string, allowed: readonly T[], fieldLabel: string) {
  const uppercaseValue = value.toUpperCase() as T;

  if (!allowed.includes(uppercaseValue)) {
    throw new Error(`Invalid ${fieldLabel}`);
  }

  return uppercaseValue;
}

function normalizeInputValue(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

export async function createSecurity(formData: FormData) {
  const user = await requireInvestmentAccessUser();

  const name = normalizeInputValue(formData, "name");
  const code = normalizeInputValue(formData, "code").toUpperCase();
  const isin = normalizeInputValue(formData, "isin").toUpperCase() || null;
  const securityTypeRaw = normalizeInputValue(formData, "type");
  const currency = normalizeInputValue(formData, "currency").toUpperCase();
  const provider = normalizeInputValue(formData, "provider") || null;
  const source = normalizeInputValue(formData, "source") || null;

  const type = normalizeEnumInput(securityTypeRaw, Object.values(SecurityType), "security type");

  if (!name) {
    throw new Error("Security name is required.");
  }

  if (!code) {
    throw new Error("Ticker/code is required.");
  }

  if (!currency) {
    throw new Error("Currency is required.");
  }

  const duplicateSecurity = await prisma.security.findFirst({
    where: {
      OR: [
        { code },
        ...(isin ? [{ isin }] : []),
      ],
    },
    select: {
      code: true,
      isin: true,
    },
  });

  if (duplicateSecurity) {
    if (duplicateSecurity.code === code) {
      throw new Error(`A security with ticker/code '${code}' already exists.`);
    }

    if (isin && duplicateSecurity.isin === isin) {
      throw new Error(`A security with ISIN '${isin}' already exists.`);
    }
  }

  try {
    await prisma.security.create({
      data: {
        name,
        code,
        isin,
        type,
        currency,
        provider,
        source,
        createdById: user.id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Security already exists. Ticker/code and ISIN must be unique.");
    }

    throw error;
  }

  revalidatePath(INVESTMENTS_PRIVATE_BASE_PATH);
}

export async function createTransaction(formData: FormData) {
  const user = await requireInvestmentAccessUser();

  const securityId = normalizeInputValue(formData, "securityId");
  const transactionTypeRaw = normalizeInputValue(formData, "type") || "BUY";
  const transactedOnRaw = normalizeInputValue(formData, "transactedOn");
  const quantityRaw = Number(formData.get("quantity") ?? 0);
  const priceRaw = Number(formData.get("price") ?? 0);
  const feesRaw = Number(formData.get("fees") ?? 0);
  const notesRaw = normalizeInputValue(formData, "notes");

  const type = normalizeEnumInput(transactionTypeRaw, Object.values(TransactionType), "transaction type");
  const transactedOn = new Date(transactedOnRaw);

  if (
    !securityId ||
    Number.isNaN(transactedOn.getTime()) ||
    Number.isNaN(quantityRaw) ||
    quantityRaw <= 0 ||
    Number.isNaN(priceRaw) ||
    priceRaw <= 0 ||
    Number.isNaN(feesRaw) ||
    feesRaw < 0
  ) {
    throw new Error("Invalid transaction data");
  }

  await prisma.investmentTransaction.create({
    data: {
      securityId,
      type,
      transactedOn,
      quantity: quantityRaw,
      price: priceRaw,
      fees: feesRaw > 0 ? feesRaw : null,
      notes: notesRaw || null,
      createdById: user.id,
    },
  });

  revalidatePath(INVESTMENTS_PRIVATE_BASE_PATH);
}
