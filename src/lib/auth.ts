import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/src/lib/db";

type UserFlags = { role?: string | null; isPremium?: boolean | null };

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async signIn({ user }) {
      const email = (user.email ?? "").toLowerCase();
      if (!email) return true;

      const admins = getAdminEmails();
      if (admins.has(email)) {
        // Persist role for convenience; role is also enforced by allowlist.
        await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } }).catch(() => undefined);
      }
      return true;
    },
    async session({ session, user }) {
      const email = (session.user?.email ?? "").toLowerCase();
      const admins = getAdminEmails();
      const flags = user as unknown as UserFlags;
      const role = email && admins.has(email) ? "admin" : flags.role ?? "user";

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          role,
          isPremium: flags.isPremium ?? false,
        },
      };
    },
  },
};


