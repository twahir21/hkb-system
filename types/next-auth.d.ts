import type { Role } from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      name: string;
      email: string;
      username?: string | null;
      picture?: string | null;
    };
  }

  interface User {
    role?: Role;
    username?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    username?: string | null;
  }
}