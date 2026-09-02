import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";

import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";

const isAdminEmail = (email: string) =>
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    // Bootstrap / upsert the user row on every Google sign-in.
    async signIn({ user, account }) {
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

      return true;
    },
    async jwt({ token, user }) {
      // On login, hydrate the token with DB-backed identity + role.
      if (user?.email) {
        const found = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });
        if (found) {
          token.userId = found.id;
          token.role = found.role;
          token.name = found.fullName;
          token.picture = found.avatarUrl ?? user.image ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
});