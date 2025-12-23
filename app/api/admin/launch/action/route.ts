import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";
import { logAdminAction } from "@/src/lib/audit/log";
import { getSiteUrl } from "@/lib/seo/site";
import { sendEmail } from "@/src/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.enum(["recalc-dry", "enrich-dry", "snapshot", "test-email"]);

export async function POST(req: Request) {
  // Rate limit admin routes
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: rl.error }, { status: rl.status, headers: rl.headers });
  }

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: rl.headers });
  }

  const url = new URL(req.url);
  const actionParam = url.searchParams.get("action");
  const parsed = ActionSchema.safeParse(actionParam);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400, headers: rl.headers });
  }

  const action = parsed.data;
  const base = getSiteUrl();
  const cronSecret = process.env.CRON_SECRET;

  try {
    let result: { ok: boolean; message: string; data?: unknown };

    switch (action) {
      case "recalc-dry": {
        if (!cronSecret) {
          return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500, headers: rl.headers });
        }
        const res = await fetch(`${base}/api/cron/recalculate?scope=recent&limit=10&dry=1`, {
          method: "GET",
          headers: { "x-cron-secret": cronSecret },
        });
        const data = await res.json();
        result = { ok: res.ok, message: "Recalculate dry run completed", data };
        break;
      }

      case "enrich-dry": {
        if (!cronSecret) {
          return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500, headers: rl.headers });
        }
        const res = await fetch(`${base}/api/cron/enrich?limit=5&dry=1`, {
          method: "POST",
          headers: { "x-cron-secret": cronSecret },
        });
        const data = await res.json();
        result = { ok: res.ok, message: "Enrichment dry run completed", data };
        break;
      }

      case "snapshot": {
        if (!cronSecret) {
          return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500, headers: rl.headers });
        }
        const res = await fetch(`${base}/api/cron/snapshot`, {
          method: "POST",
          headers: { "x-cron-secret": cronSecret },
        });
        const data = await res.json();
        result = { ok: res.ok, message: "Snapshot generated", data };
        break;
      }

      case "test-email": {
        const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
        if (adminEmails.length === 0) {
          return NextResponse.json({ ok: false, error: "No admin emails configured" }, { status: 500, headers: rl.headers });
        }
        const testEmail = adminEmails[0]!;
        await sendEmail({
          to: testEmail,
          subject: "RoMarketCap Test Email",
          text: "This is a test email from the launch checklist.",
          html: "<p>This is a test email from the launch checklist.</p>",
        });
        result = { ok: true, message: `Test email sent to ${testEmail}` };
        break;
      }
    }

    // Log action
    await logAdminAction({
      actorUserId: session.user.id,
      action: "LAUNCH_CHECKLIST_ACTION",
      entityType: "LAUNCH_CHECKLIST",
      entityId: action,
      metadata: { action, result: result.ok ? "success" : "failure" },
    });

    return NextResponse.json(result, { headers: rl.headers });
  } catch (error) {
    console.error("[launch:action] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: rl.headers },
    );
  }
}

