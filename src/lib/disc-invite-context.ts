import { cookies } from "next/headers";

const DISC_INVITE_COOKIE = "disc_invite_token";
const DISC_INVITE_COOKIE_MAX_AGE_SECONDS = 60 * 30;

export async function persistDiscInviteContext(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(DISC_INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DISC_INVITE_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function readDiscInviteContext() {
  const cookieStore = await cookies();
  return cookieStore.get(DISC_INVITE_COOKIE)?.value ?? null;
}

export async function clearDiscInviteContext() {
  const cookieStore = await cookies();
  cookieStore.delete(DISC_INVITE_COOKIE);
}
