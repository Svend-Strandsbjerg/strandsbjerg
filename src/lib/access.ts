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
type SessionUser = {
  id: string;
  role?: "ADMIN" | "FAMILY" | "USER";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
};

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

export function isApprovedFamilyUser(user?: SessionUser | null) {
  return Boolean(user?.id && user.role === "FAMILY" && user.approvalStatus === "APPROVED");
}

export async function requireApprovedFamilyUser() {
  const user = await requireUser();

  if (!isApprovedFamilyUser(user)) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(searchParams?: SearchParams) {
  if (isEditModeEnabled()) {
    const requestHeaders = await headers();
    const cookieStore = await cookies();
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
