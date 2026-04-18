import { cookies } from "next/headers";

const DISC_PROMO_COOKIE = "disc_promo_token";
const DISC_PROMO_REDEMPTION_COOKIE = "disc_promo_redemption_id";
const MAX_AGE_SECONDS = 60 * 60;

export async function persistDiscPromoTokenContext(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(DISC_PROMO_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readDiscPromoTokenContext() {
  const cookieStore = await cookies();
  return cookieStore.get(DISC_PROMO_COOKIE)?.value ?? null;
}

export async function clearDiscPromoTokenContext() {
  const cookieStore = await cookies();
  cookieStore.delete(DISC_PROMO_COOKIE);
}

export async function persistDiscPromoRedemptionContext(redemptionId: string) {
  const cookieStore = await cookies();

  cookieStore.set(DISC_PROMO_REDEMPTION_COOKIE, redemptionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readDiscPromoRedemptionContext() {
  const cookieStore = await cookies();
  return cookieStore.get(DISC_PROMO_REDEMPTION_COOKIE)?.value ?? null;
}

export async function clearDiscPromoRedemptionContext() {
  const cookieStore = await cookies();
  cookieStore.delete(DISC_PROMO_REDEMPTION_COOKIE);
}
