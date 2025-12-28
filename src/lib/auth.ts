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
  session: { 
    strategy: "jwt", // JWT required for CredentialsProvider, but we can still use database for OAuth sessions
  },
  callbacks: {
    async signIn({ user, account }) {
      const email = (user.email ?? "").toLowerCase();
      if (!email) return true;

      // Don't update user in signIn callback - PrismaAdapter handles user creation
      // We'll update admin role in a non-blocking way after sign-in completes
      // The password field will be null by default for OAuth users (PrismaAdapter handles this)
      
      // Only update admin role if needed (non-blocking, fire and forget)
      const admins = getAdminEmails();
      if (admins.has(email)) {
        // Update admin role asynchronously (don't block sign-in)
        prisma.user.update({ 
          where: { id: user.id }, 
          data: { role: "admin" } 
        }).catch((err) => {
          console.error("[auth] Error updating admin role:", err);
        });
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      // When user signs in, add user data to token
      if (user) {
        const email = (user.email ?? "").toLowerCase();
        const admins = getAdminEmails();
        const flags = user as unknown as UserFlags;
        const role = email && admins.has(email) ? "admin" : flags.role ?? "user";
        
        token.id = user.id;
        token.role = role;
        token.isPremium = flags.isPremium ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      // Add token data to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isPremium = (token.isPremium as boolean) ?? false;
      }
      return session;
    },
  },
};


