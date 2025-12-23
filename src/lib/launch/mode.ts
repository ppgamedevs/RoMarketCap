/**
 * Launch Mode enforcement.
 * When LAUNCH_MODE=1, enforce strict production behavior.
 */

/**
 * Check if launch mode is active.
 */
export function isLaunchMode(): boolean {
  return process.env.LAUNCH_MODE === "1";
}

/**
 * Get effective demo mode (disabled if launch mode is active).
 */
export function getEffectiveDemoMode(): boolean {
  if (isLaunchMode()) {
    return false; // Force demo mode off in launch mode
  }
  return process.env.DEMO_MODE === "1";
}

/**
 * Check if demo operations are allowed (seed/clear).
 * Disallowed in launch mode.
 */
export function isDemoOperationsAllowed(): boolean {
  return !isLaunchMode();
}

