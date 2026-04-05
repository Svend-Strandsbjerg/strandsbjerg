import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: "ADMIN" | "FAMILY" | "USER";
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  }

  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      role?: "ADMIN" | "FAMILY" | "USER";
      approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "FAMILY" | "USER";
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  }
}
