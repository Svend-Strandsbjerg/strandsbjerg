import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { verifyPassword } from "@/lib/password";
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
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approvalStatus: user.approvalStatus,
        };
      },
    }),
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
    signIn: async ({ user, account }) => {
      if (account?.provider === "credentials") {
        if (user.approvalStatus === "PENDING") {
          return "/login?error=pending_approval";
        }

        if (user.approvalStatus === "REJECTED") {
          return "/login?error=rejected_account";
        }
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? "USER";
        token.approvalStatus = user.approvalStatus ?? "PENDING";
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "USER";
        session.user.approvalStatus = token.approvalStatus ?? "PENDING";
      }
      return session;
    },
  },
});
