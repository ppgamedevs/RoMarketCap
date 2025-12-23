import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

export async function getEntitlement() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, isPremium: false, userId: null };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  return { ok: true as const, isPremium: Boolean(user?.isPremium), userId: session.user.id };
}


