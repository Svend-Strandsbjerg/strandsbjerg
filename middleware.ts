import { NextResponse } from "next/server";

import { canAccessFamilyFromSubject, canAccessInvestmentsFromSubject } from "@/lib/access-rules";
import { auth } from "@/lib/auth";
import { FAMILY_PRIVATE_BASE_PATH, INVESTMENTS_PRIVATE_BASE_PATH } from "@/lib/private-routes";

export default auth((req) => {
  const isAuthenticated = Boolean(req.auth?.user?.id);
  const pathname = req.nextUrl.pathname;

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith(FAMILY_PRIVATE_BASE_PATH) && !canAccessFamilyFromSubject(req.auth?.user)) {
    return NextResponse.redirect(new URL("/login?state=restricted", req.url));
  }

  if (pathname.startsWith(INVESTMENTS_PRIVATE_BASE_PATH) && !canAccessInvestmentsFromSubject(req.auth?.user)) {
    return NextResponse.redirect(new URL("/login?state=restricted", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/x7k2p9q4v1m8/:path*", "/m4z8r2q9t7y1/:path*"],
};
