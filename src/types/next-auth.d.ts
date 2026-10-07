import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "USER" | "ADMIN";
      accessBlocked?: boolean;
      authVersion?: number;
    };
  }

  interface User {
    role: "USER" | "ADMIN";
    passwordHash?: string | null;
    authVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "ADMIN";
    accessBlocked?: boolean;
    authVersion?: number;
  }
}
