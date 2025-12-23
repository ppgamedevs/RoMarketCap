import { isFlagEnabled } from "./flags";

/**
 * Check if read-only mode is enabled.
 * In read-only mode, all mutations are blocked.
 */
export async function isReadOnlyMode(): Promise<boolean> {
  return isFlagEnabled("READ_ONLY_MODE");
}

/**
 * Check if a request should be blocked due to read-only mode.
 * Admin users bypass read-only mode.
 */
export async function shouldBlockMutation(req: Request, isAdmin: boolean): Promise<{ blocked: boolean; reason?: string }> {
  if (isAdmin) {
    return { blocked: false };
  }

  const readOnly = await isReadOnlyMode();
  if (readOnly) {
    return { blocked: true, reason: "System is in read-only mode. Mutations are temporarily disabled." };
  }

  return { blocked: false };
}

