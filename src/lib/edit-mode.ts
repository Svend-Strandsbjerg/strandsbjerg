import { createHash, timingSafeEqual } from "node:crypto";

export const EDIT_SECRET_QUERY_PARAM = "editSecret";
export const EDIT_SECRET_HEADER = "x-edit-secret";
export const EDIT_ACCESS_COOKIE = "edit-access";

function normalizeSecret(value: string | undefined) {
  const secret = value?.trim();
  return secret ? secret : null;
}

function toBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

export function isEditModeEnabled() {
  return process.env.EDIT_MODE === "true";
}

export function getEditModeSecret() {
  return normalizeSecret(process.env.EDIT_MODE_SECRET);
}

export function createEditAccessToken(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function isValidEditModeSecret(value: string | null | undefined) {
  const secret = getEditModeSecret();
  const candidate = normalizeSecret(value ?? undefined);

  if (!secret || !candidate) {
    return false;
  }

  const secretBuffer = toBuffer(secret);
  const candidateBuffer = toBuffer(candidate);

  if (secretBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(secretBuffer, candidateBuffer);
}

export function isValidEditAccessToken(value: string | null | undefined) {
  const secret = getEditModeSecret();
  const candidate = normalizeSecret(value ?? undefined);

  if (!secret || !candidate) {
    return false;
  }

  const expectedToken = createEditAccessToken(secret);
  const expectedBuffer = toBuffer(expectedToken);
  const candidateBuffer = toBuffer(candidate);

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, candidateBuffer);
}
