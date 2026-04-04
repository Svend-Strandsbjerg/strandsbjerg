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

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Google,
    Resend({
      from: process.env.AUTH_EMAIL_FROM ?? "noreply@example.com",
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role ?? "FAMILY";
      }
      return session;
    },
  },
});
