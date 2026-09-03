import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq, or, sql } from "drizzle-orm";

import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";

const isAdminEmail = (email: string) =>
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

const providers: Provider[] = [
  Credentials({
    id: "credentials",
    name: "Username & Password",
    credentials: {
      identifier: { label: "Username or Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.identifier || !credentials?.password) {
        return null;
      }

      const identifier = String(credentials.identifier).trim();
      const password = String(credentials.password);

      // Search user by username or email (case-insensitive)
      const foundUser = await db.query.users.findFirst({
        where: or(
          eq(sql`lower(${users.username})`, identifier.toLowerCase()),
          eq(sql`lower(${users.email})`, identifier.toLowerCase())
        ),
      });

      if (!foundUser || !foundUser.passwordHash) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, foundUser.passwordHash);
      if (!isValidPassword) {
        return null;
      }

      return {
        id: foundUser.id,
        name: foundUser.fullName,
        email: foundUser.email,
        role: foundUser.role,
        username: foundUser.username,
        image: foundUser.avatarUrl,
      };
    },
  }),
];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Bootstrap / upsert the user row on Google sign-in.
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        const existing = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });

        const googleId = account?.providerAccountId ?? user.id ?? "";
        const allowListedAdmin = isAdminEmail(user.email);

        if (!existing) {
          await db
            .insert(users)
            .values({
              googleId,
              email: user.email,
              fullName: user.name ?? user.email,
              avatarUrl: user.image ?? null,
              role: allowListedAdmin ? ("SUPER_ADMIN" as Role) : "GUARD",
            })
            .onConflictDoNothing();
        } else {
          await db
            .update(users)
            .set({
              fullName: user.name ?? existing.fullName,
              avatarUrl: user.image ?? existing.avatarUrl,
              googleId: existing.googleId || googleId,
              // Never downgrade an allow-listed admin; otherwise keep DB role.
              role: allowListedAdmin ? ("SUPER_ADMIN" as Role) : existing.role,
            })
            .where(eq(users.id, existing.id));
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      // On initial login from Credentials or Google
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: Role }).role;
        token.username = (user as { username?: string | null }).username;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image ?? null;
      }

      // If needed, hydrate from DB on subsequent passes
      if (token.email && (!token.userId || !token.role)) {
        const found = await db.query.users.findFirst({
          where: eq(users.email, token.email as string),
        });
        if (found) {
          token.userId = found.id;
          token.role = found.role;
          token.username = found.username;
          token.name = found.fullName;
          token.picture = found.avatarUrl ?? token.picture ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
        session.user.username = token.username as string | null;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
});