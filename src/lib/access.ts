import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  canAccessAdminCockpitFromSubject,
  canAccessAdminFromSubject,
  canAccessDiscAdminFromSubject,
  canAccessFamilyFromSubject,
  canAccessInvestmentsFromSubject,
  canAccessSiteAdminFromSubject,
} from "@/lib/access-rules";
import { auth } from "@/lib/auth";
import { logServerEvent } from "@/lib/logger";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
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
  role?: "ADMIN" | "USER";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  isSiteAdmin?: boolean;
  isDiscAdmin?: boolean;
};

function fromSearchParams(searchParams?: SearchParams) {
  const value = searchParams?.[EDIT_SECRET_QUERY_PARAM];
  return Array.isArray(value) ? value[0] : value;
}

export function canAccessFamily(user?: SessionUser | null) {
  return canAccessFamilyFromSubject(user);
}

export function canAccessInvestments(user?: SessionUser | null) {
  return canAccessInvestmentsFromSubject(user);
}

export function canAccessAdmin(user?: SessionUser | null) {
  return canAccessAdminFromSubject(user);
}

export function canAccessDiscAdmin(user?: SessionUser | null) {
  return canAccessDiscAdminFromSubject(user);
}

export function canAccessSiteAdmin(user?: SessionUser | null) {
  return canAccessSiteAdminFromSubject(user);
}

export function canAccessAdminCockpit(user?: SessionUser | null) {
  return canAccessAdminCockpitFromSubject(user);
}

export async function requireUser(options?: { nextPath?: string }) {
  const session = await auth();

  if (!session?.user?.id) {
    const nextPath = getSafeRedirectPath(options?.nextPath, "");
    const loginPath = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    redirect(loginPath);
  }

  return session.user;
}

export async function requireFamilyAccessUser() {
  const user = await requireUser();

  if (!canAccessFamily(user)) {
    redirect("/login?state=restricted");
  }

  return user;
}

export async function requireInvestmentAccessUser() {
  const user = await requireUser();

  if (!canAccessInvestments(user)) {
    redirect("/login?state=restricted");
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

  if (!canAccessAdmin(user)) {
    redirect("/login?state=restricted");
  }

  return user;
}

export async function requireUserAdmin() {
  return requireAdmin();
}

export async function requireSiteAdmin() {
  if (isEditModeEnabled()) {
    await requireAdmin();
    return null;
  }

  const user = await requireUser();

  if (!canAccessSiteAdmin(user)) {
    redirect("/admin?status=adgang_nægtet");
  }

  return user;
}

export async function requireDiscAdmin() {
  const user = await requireUser();
  const allowed = canAccessDiscAdmin(user);

  logServerEvent("info", "disc_admin_access_guard_checked", {
    userId: user.id,
    isAdmin: user.role === "ADMIN",
    isDiscAdmin: Boolean(user.isDiscAdmin),
    allowed,
  });

  if (!allowed) {
    redirect("/admin?status=adgang_nægtet");
  }

  return user;
}
