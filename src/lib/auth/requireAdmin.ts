import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  // Role is computed in session callback using ADMIN_EMAILS allowlist.
  if (session.user.role !== "admin") return null;
  return session;
}


