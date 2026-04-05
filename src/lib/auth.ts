import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { prisma } from "@/lib/prisma";

const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "development" ? "local-dev-auth-secret" : undefined);
const hasGoogleOAuthCredentials = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const hasResendCredentials = Boolean(process.env.AUTH_RESEND_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    ...(hasGoogleOAuthCredentials ? [Google] : []),
    ...(hasResendCredentials
      ? [
          Resend({
            from: process.env.AUTH_EMAIL_FROM ?? "noreply@example.com",
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role ?? "USER";
        token.approvalStatus = user.approvalStatus ?? "PENDING";
      }

      return token;
    },
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role ?? "USER";
        session.user.approvalStatus = user.approvalStatus ?? "PENDING";
      }
      return session;
    },
  },
});
