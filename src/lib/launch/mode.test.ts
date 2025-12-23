import { describe, it, expect, beforeEach, vi } from "vitest";

describe("launch mode", () => {
  beforeEach(() => {
    // Reset env vars
    delete process.env.LAUNCH_MODE;
    delete process.env.DEMO_MODE;
  });

  it("detects launch mode", async () => {
    process.env.LAUNCH_MODE = "1";
    const { isLaunchMode } = await import("./mode");
    expect(isLaunchMode()).toBe(true);
  });

  it("detects non-launch mode", async () => {
    process.env.LAUNCH_MODE = "0";
    const { isLaunchMode } = await import("./mode");
    expect(isLaunchMode()).toBe(false);
  });

  it("forces demo mode off in launch mode", async () => {
    process.env.LAUNCH_MODE = "1";
    process.env.DEMO_MODE = "1";
    const { getEffectiveDemoMode } = await import("./mode");
    expect(getEffectiveDemoMode()).toBe(false);
  });

  it("allows demo mode when not in launch mode", async () => {
    process.env.LAUNCH_MODE = "0";
    process.env.DEMO_MODE = "1";
    const { getEffectiveDemoMode } = await import("./mode");
    expect(getEffectiveDemoMode()).toBe(true);
  });

  it("blocks demo operations in launch mode", async () => {
    process.env.LAUNCH_MODE = "1";
    const { isDemoOperationsAllowed } = await import("./mode");
    expect(isDemoOperationsAllowed()).toBe(false);
  });

  it("allows demo operations when not in launch mode", async () => {
    process.env.LAUNCH_MODE = "0";
    const { isDemoOperationsAllowed } = await import("./mode");
    expect(isDemoOperationsAllowed()).toBe(true);
  });
});

