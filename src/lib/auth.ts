import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { verifyPassword } from "@/lib/password";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "development" ? "local-dev-auth-secret" : undefined);
const hasGoogleOAuthCredentials = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const hasResendCredentials = Boolean(process.env.AUTH_RESEND_KEY);
const APPROVAL_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"] as const);

function normalizeApprovalStatus(value: unknown): "PENDING" | "APPROVED" | "REJECTED" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toUpperCase();
  return APPROVAL_STATUSES.has(normalized as "PENDING" | "APPROVED" | "REJECTED")
    ? (normalized as "PENDING" | "APPROVED" | "REJECTED")
    : undefined;
}

function mapAuthMethod(provider?: string): "CREDENTIALS" | "GOOGLE" | "MAGIC_LINK" | "OAUTH" {
  if (provider === "credentials") {
    return "CREDENTIALS";
  }

  if (provider === "google") {
    return "GOOGLE";
  }

  if (provider === "resend" || provider === "email") {
    return "MAGIC_LINK";
  }

  return "OAUTH";
}

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
          approvalStatus: normalizeApprovalStatus(user.approvalStatus),
          isSiteAdmin: user.isSiteAdmin,
          isDiscAdmin: user.isDiscAdmin,
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
        const approvalStatus = normalizeApprovalStatus(user.approvalStatus);

        if (approvalStatus === "PENDING") {
          return "/login?error=pending_approval";
        }

        if (approvalStatus === "REJECTED") {
          return "/login?error=rejected_account";
        }
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? "USER";
        token.approvalStatus = normalizeApprovalStatus(user.approvalStatus);
        token.isSiteAdmin = Boolean(user.isSiteAdmin);
        token.isDiscAdmin = Boolean(user.isDiscAdmin);
      } else if (token.sub) {
        const latestUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, approvalStatus: true, isSiteAdmin: true, isDiscAdmin: true },
        });

        if (latestUser) {
          token.role = latestUser.role;
          token.approvalStatus = normalizeApprovalStatus(latestUser.approvalStatus);
          token.isSiteAdmin = latestUser.isSiteAdmin;
          token.isDiscAdmin = latestUser.isDiscAdmin;
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "USER";
        session.user.approvalStatus = normalizeApprovalStatus(token.approvalStatus);
        session.user.isSiteAdmin = Boolean(token.isSiteAdmin);
        session.user.isDiscAdmin = Boolean(token.isDiscAdmin);
      }
      return session;
    },
  },
  events: {
    signIn: async ({ user, account }) => {
      if (!user.id) {
        return;
      }

      try {
        await prisma.loginActivity.create({
          data: {
            userId: user.id,
            authMethod: mapAuthMethod(account?.provider),
          },
        });
      } catch (error) {
        logServerEvent("error", "login_activity_record_failed", { userId: user.id, error });
      }
    },
  },
});
