import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: "ADMIN" | "USER";
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
    isDiscAdmin?: boolean;
  }

  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      role?: "ADMIN" | "USER";
      approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
      isDiscAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "USER";
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
    isDiscAdmin?: boolean;
  }
}
