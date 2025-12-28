import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/src/lib/db";
import { verifyPassword } from "./auth/password";

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
    // Email/Password - For regular users
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            emailVerified: true,
            role: true,
            isPremium: true,
          },
        }).catch(() => null);

        if (!user || !user.password) {
          return null; // User doesn't exist or uses OAuth
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Email not verified");
        }

        // Verify password
        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isPremium: user.isPremium,
        };
      },
    }),
    // GitHub OAuth - Available for all (primarily for admins)
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: { strategy: "database" },
  callbacks: {
    async signIn({ user, account }) {
      const email = (user.email ?? "").toLowerCase();
      if (!email) return true;

      // For OAuth users, ensure password field is null (not set)
      // This handles the case where password column might not exist yet
      try {
        const admins = getAdminEmails();
        if (admins.has(email)) {
          // Persist role for convenience; role is also enforced by allowlist.
          await prisma.user.update({ 
            where: { id: user.id }, 
            data: { 
              role: "admin",
              // Only set password to null if account is OAuth (not credentials)
              ...(account?.provider !== "credentials" ? { password: null } : {})
            } 
          }).catch(() => undefined);
        } else if (account?.provider !== "credentials") {
          // For OAuth users, ensure password is null
          await prisma.user.update({ 
            where: { id: user.id }, 
            data: { password: null } 
          }).catch(() => undefined);
        }
      } catch (error: any) {
        // If password column doesn't exist, that's okay - migration needs to be run
        // But don't fail the sign-in process
        if (error?.code === "42703" || error?.message?.includes("column") || error?.message?.includes("password")) {
          console.warn("[auth] Password column not found - migration needed");
        } else {
          console.error("[auth] Error in signIn callback:", error);
        }
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


