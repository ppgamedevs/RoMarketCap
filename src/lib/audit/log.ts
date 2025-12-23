import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";

export async function logAdminAction(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    // Get the last audit log entry to chain the hash
    const lastEntry = await prisma.adminAuditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { prevHash: true },
    });

    const prevHash = lastEntry?.prevHash ?? null;

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
        prevHash: prevHash, // Store previous hash to maintain chain
      },
    });
  } catch {
    // Never block admin flows on audit log write.
  }
}


