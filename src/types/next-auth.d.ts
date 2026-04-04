import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "ADMIN" | "FAMILY";
  }

  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      role?: "ADMIN" | "FAMILY";
    };
  }
}
