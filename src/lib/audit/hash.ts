import crypto from "crypto";

/**
 * Compute hash for an audit log entry.
 * Uses SHA-256 of: prevHash + action + entityType + entityId + timestamp + metadata
 */
export function hashAuditEntry(input: {
  prevHash: string | null;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}): string {
  const parts = [
    input.prevHash ?? "",
    input.action,
    input.entityType,
    input.entityId,
    input.timestamp,
    JSON.stringify(input.metadata ?? {}),
  ];
  const payload = parts.join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Verify audit log chain integrity.
 * Returns true if all entries form a valid hash chain.
 */
export async function verifyAuditChain(entries: Array<{ prevHash: string | null; action: string; entityType: string; entityId: string; createdAt: Date; metadata: unknown }>): Promise<boolean> {
  if (entries.length === 0) return true;

  let prevHash: string | null = null;
  for (const entry of entries) {
    const expectedHash = hashAuditEntry({
      prevHash,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      timestamp: entry.createdAt.toISOString(),
      metadata: entry.metadata as Record<string, unknown> | null,
    });

    // For the first entry, prevHash should be null
    // For subsequent entries, prevHash should match the previous entry's hash
    if (entry.prevHash !== prevHash) {
      return false;
    }

    // In a real implementation, we'd store the computed hash in the entry
    // For now, we just verify the chain links correctly
    prevHash = expectedHash;
  }

  return true;
}

