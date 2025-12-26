import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/src/lib/db";

// Vercel OAuth2 provider (generic OAuth2 since NextAuth doesn't have built-in Vercel provider)
function VercelProvider(options: { clientId: string; clientSecret: string }) {
  return {
    id: "vercel",
    name: "Vercel",
    type: "oauth",
    authorization: {
      url: "https://vercel.com/integrations/auth/authorize",
      params: {
        scope: "user:email",
        response_type: "code",
      },
    },
    token: "https://vercel.com/integrations/auth/token",
    userinfo: "https://api.vercel.com/v2/user",
    client: {
      id: options.clientId,
      secret: options.clientSecret,
    },
    profile(profile: any) {
      return {
        id: profile.user.id,
        name: profile.user.name,
        email: profile.user.email,
        image: profile.user.avatar,
      };
    },
  };
}

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
    // GitHub OAuth - Easy to set up, widely used
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
    // Vercel OAuth - For admin/internal use
    ...(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET
      ? [
          VercelProvider({
            clientId: process.env.VERCEL_CLIENT_ID,
            clientSecret: process.env.VERCEL_CLIENT_SECRET,
          }) as any,
        ]
      : []),
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


