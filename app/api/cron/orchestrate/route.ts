import { NextResponse } from "next/server";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { kv } from "@vercel/kv";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import { notifyCritical } from "@/src/lib/alerts/critical";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron orchestrator: runs all cron jobs in sequence with budget controls.
 * GET/POST /api/cron/orchestrate
 * Protected by CRON_SECRET header.
 */
export async function GET(req: Request) {
  return handleOrchestrate(req);
}

export async function POST(req: Request) {
  return handleOrchestrate(req);
}

async function handleOrchestrate(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Check for distributed lock
    const lockId = await acquireLockWithRetry("cron:orchestrate", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      const startTime = Date.now();
      const stats: Record<string, { ok: boolean; duration: number; error?: string }> = {};

      // 1. Recalculate (if enabled)
      if (await isFlagEnabled("CRON_RECALCULATE", true)) {
        try {
          const stepStart = Date.now();
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/cron/recalculate?limit=200`, {
            method: "GET",
            headers: { "x-cron-secret": secret },
          });
          const data = await res.json().catch(() => ({ ok: false }));
          stats.recalculate = {
            ok: data.ok === true,
            duration: Date.now() - stepStart,
            error: data.ok === false ? data.error : undefined,
          };
          if (data.ok) {
            await kv.set("cron:last:recalculate", new Date().toISOString());
          }
        } catch (error) {
          stats.recalculate = {
            ok: false,
            duration: Date.now() - Date.now(),
            error: error instanceof Error ? error.message : "Unknown error",
          };
          Sentry.captureException(error);
        }
      } else {
        stats.recalculate = { ok: true, duration: 0 }; // Skipped
      }

      // 2. Enrich (if enabled)
      if (await isFlagEnabled("CRON_ENRICH", true)) {
        try {
          const stepStart = Date.now();
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/cron/enrich?limit=50`, {
            method: "POST",
            headers: { "x-cron-secret": secret },
          });
          const data = await res.json().catch(() => ({ ok: false }));
          stats.enrich = {
            ok: data.ok === true,
            duration: Date.now() - stepStart,
            error: data.ok === false ? data.error : undefined,
          };
          if (data.ok) {
            await kv.set("cron:last:enrich", new Date().toISOString());
          }
        } catch (error) {
          stats.enrich = {
            ok: false,
            duration: Date.now() - Date.now(),
            error: error instanceof Error ? error.message : "Unknown error",
          };
          Sentry.captureException(error);
        }
      } else {
        stats.enrich = { ok: true, duration: 0 }; // Skipped
      }

      // 3. Unified Ingestion v2 (PROMPT 55) - if enabled, use this instead of old ingestion
      if (await isFlagEnabled("INGEST_ENABLED", false)) {
        try {
          const stepStart = Date.now();
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/cron/ingest-v2?limit=200&budgetMs=25000`, {
            method: "POST",
            headers: { "x-cron-secret": secret },
          });
          const data = await res.json().catch(() => ({ ok: false }));
          stats.unifiedIngest = {
            ok: data.ok === true,
            duration: Date.now() - stepStart,
            error: data.ok === false ? data.error : undefined,
          };
          if (data.ok) {
            await kv.set("cron:last:ingest-v2", new Date().toISOString());
          }
        } catch (error) {
          stats.unifiedIngest = {
            ok: false,
            duration: Date.now() - Date.now(),
            error: error instanceof Error ? error.message : "Unknown error",
          };
          Sentry.captureException(error);
        }
      } else {
        stats.unifiedIngest = { ok: true, duration: 0 }; // Skipped
      }

      // 3b. National Ingestion (SEAP + EU Funds, if enabled - legacy, use v2 above if available)
      if (await isFlagEnabled("CRON_INGEST_NATIONAL", true) && !(await isFlagEnabled("INGEST_ENABLED", false))) {
        // Process SEAP
        try {
          const stepStart = Date.now();
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/cron/ingest-national?source=SEAP&limit=500`, {
            method: "POST",
            headers: { "x-cron-secret": secret },
          });
          const data = await res.json().catch(() => ({ ok: false }));
          stats.ingestSeap = {
            ok: data.ok === true,
            duration: Date.now() - stepStart,
            error: data.ok === false ? data.error : undefined,
          };
          if (data.ok) {
            await kv.set("cron:last:ingest-national:SEAP", new Date().toISOString());
          }
        } catch (error) {
          stats.ingestSeap = {
            ok: false,
            duration: Date.now() - Date.now(),
            error: error instanceof Error ? error.message : "Unknown error",
          };
          Sentry.captureException(error);
        }

        // Process EU Funds
        try {
          const stepStart = Date.now();
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/cron/ingest-national?source=EU_FUNDS&limit=500`, {
            method: "POST",
            headers: { "x-cron-secret": secret },
          });
          const data = await res.json().catch(() => ({ ok: false }));
          stats.ingestEuFunds = {
            ok: data.ok === true,
            duration: Date.now() - stepStart,
            error: data.ok === false ? data.error : undefined,
          };
          if (data.ok) {
            await kv.set("cron:last:ingest-national:EU_FUNDS", new Date().toISOString());
          }
        } catch (error) {
          stats.ingestEuFunds = {
            ok: false,
            duration: Date.now() - Date.now(),
            error: error instanceof Error ? error.message : "Unknown error",
          };
          Sentry.captureException(error);
        }
      } else {
        stats.ingestSeap = { ok: true, duration: 0 }; // Skipped
        stats.ingestEuFunds = { ok: true, duration: 0 }; // Skipped
      }

      // 4. Watchlist Alerts (if enabled)
      if (await isFlagEnabled("ALERTS", true)) {
        try {
          const stepStart = Date.now();
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/cron/watchlist-alerts?limit=200`, {
            method: "GET",
            headers: { "x-cron-secret": secret },
          });
          const data = await res.json().catch(() => ({ ok: false }));
          stats.watchlistAlerts = {
            ok: data.ok === true,
            duration: Date.now() - stepStart,
            error: data.ok === false ? data.error : undefined,
          };
          if (data.ok) {
            await kv.set("cron:last:watchlist-alerts", new Date().toISOString());
          }
        } catch (error) {
          stats.watchlistAlerts = {
            ok: false,
            duration: Date.now() - Date.now(),
            error: error instanceof Error ? error.message : "Unknown error",
          };
          Sentry.captureException(error);
        }
      } else {
        stats.watchlistAlerts = { ok: true, duration: 0 }; // Skipped
      }

      // 5. Billing Reconcile (if enabled)
      if (await isFlagEnabled("CRON_BILLING_RECONCILE", true)) {
        try {
          const stepStart = Date.now();
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/cron/billing-reconcile?limit=500`, {
            method: "GET",
            headers: { "x-cron-secret": secret },
          });
          const data = await res.json().catch(() => ({ ok: false }));
          stats.billingReconcile = {
            ok: data.ok === true,
            duration: Date.now() - stepStart,
            error: data.ok === false ? data.error : undefined,
          };
          if (data.ok) {
            await kv.set("cron:last:billing-reconcile", new Date().toISOString());
          }
        } catch (error) {
          stats.billingReconcile = {
            ok: false,
            duration: Date.now() - Date.now(),
            error: error instanceof Error ? error.message : "Unknown error",
          };
          Sentry.captureException(error);
        }
      } else {
        stats.billingReconcile = { ok: true, duration: 0 }; // Skipped
      }

      // 6. Snapshot (once per day only, if enabled)
      if (await isFlagEnabled("CRON_SNAPSHOT", true)) {
        const today = new Date().toISOString().split("T")[0];
        const lastSnapshotDate = await kv.get<string>("cron:last:snapshot:date");
        if (lastSnapshotDate !== today) {
          try {
            const stepStart = Date.now();
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
            const res = await fetch(`${baseUrl}/api/cron/snapshot`, {
              method: "POST",
              headers: { "x-cron-secret": secret },
            });
            const data = await res.json().catch(() => ({ ok: false }));
            stats.snapshot = {
              ok: data.ok === true,
              duration: Date.now() - stepStart,
              error: data.ok === false ? data.error : undefined,
            };
            if (data.ok) {
              await kv.set("cron:last:snapshot", new Date().toISOString());
              await kv.set("cron:last:snapshot:date", today);
            }
          } catch (error) {
            stats.snapshot = {
              ok: false,
              duration: Date.now() - Date.now(),
              error: error instanceof Error ? error.message : "Unknown error",
            };
            Sentry.captureException(error);
          }
        } else {
          stats.snapshot = { ok: true, duration: 0 }; // Already ran today
        }
      } else {
        stats.snapshot = { ok: true, duration: 0 }; // Skipped
      }

      // 7. Weekly Digest (once per week only, if enabled)
      if (await isFlagEnabled("NEWSLETTER_SENDS", true)) {
        const weekStart = getWeekStart(new Date()).toISOString();
        const lastDigestWeek = await kv.get<string>("cron:last:weekly-digest:week");
        if (lastDigestWeek !== weekStart) {
          try {
            const stepStart = Date.now();
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
            const res = await fetch(`${baseUrl}/api/cron/weekly-digest`, {
              method: "GET",
              headers: { "x-cron-secret": secret },
            });
            const data = await res.json().catch(() => ({ ok: false }));
            stats.weeklyDigest = {
              ok: data.ok === true,
              duration: Date.now() - stepStart,
              error: data.ok === false ? data.error : undefined,
            };
            if (data.ok) {
              await kv.set("cron:last:weekly-digest", new Date().toISOString());
              await kv.set("cron:last:weekly-digest:week", weekStart);
            }
          } catch (error) {
            stats.weeklyDigest = {
              ok: false,
              duration: Date.now() - Date.now(),
              error: error instanceof Error ? error.message : "Unknown error",
            };
            Sentry.captureException(error);
          }
        } else {
          stats.weeklyDigest = { ok: true, duration: 0 }; // Already ran this week
        }
      } else {
        stats.weeklyDigest = { ok: true, duration: 0 }; // Skipped
      }

      // Store stats
      const totalDuration = Date.now() - startTime;
      await kv.set("cron:last:orchestrate", new Date().toISOString());
      await kv.set("cron:stats:orchestrate", JSON.stringify({ ...stats, totalDuration, timestamp: new Date().toISOString() }));

      // Check for critical failures
      const failures = Object.entries(stats).filter(([_, s]) => !s.ok);
      if (failures.length > 0) {
        await notifyCritical({
          route: "/api/cron/orchestrate",
          message: `Failures: ${failures.map(([k]) => k).join(", ")}`,
        });
      }

      return NextResponse.json({
        ok: true,
        stats,
        totalDuration,
      });
    } finally {
      await releaseLock("cron:orchestrate", lockId);
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({
      route: "/api/cron/orchestrate",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

