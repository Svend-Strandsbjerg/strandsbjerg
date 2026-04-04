import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  EDIT_ACCESS_COOKIE,
  EDIT_SECRET_HEADER,
  EDIT_SECRET_QUERY_PARAM,
  createEditAccessToken,
  getEditModeSecret,
  isEditModeEnabled,
  isValidEditAccessToken,
  isValidEditModeSecret,
} from "@/lib/edit-mode";

type SearchParams = Record<string, string | string[] | undefined>;

function fromSearchParams(searchParams?: SearchParams) {
  const value = searchParams?.[EDIT_SECRET_QUERY_PARAM];
  return Array.isArray(value) ? value[0] : value;
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

export async function requireAdmin(searchParams?: SearchParams) {
  if (isEditModeEnabled()) {
    const requestHeaders = headers();
    const cookieStore = cookies();
    const secretFromHeader = requestHeaders.get(EDIT_SECRET_HEADER);
    const secretFromQuery = fromSearchParams(searchParams);
    const hasValidSecret = isValidEditModeSecret(secretFromHeader) || isValidEditModeSecret(secretFromQuery);
    const hasValidAccessCookie = isValidEditAccessToken(cookieStore.get(EDIT_ACCESS_COOKIE)?.value);

    if (hasValidSecret) {
      const secret = getEditModeSecret();

      if (!secret) {
        redirect("/");
      }

      cookieStore.set(EDIT_ACCESS_COOKIE, createEditAccessToken(secret), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/admin",
      });

      return null;
    }

    if (hasValidAccessCookie) {
      return null;
    }

    redirect("/");
  }

  const user = await requireUser();

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}
