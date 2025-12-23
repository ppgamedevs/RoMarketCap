import { NextResponse } from "next/server";
function requireCronSecret(req: Request): { ok: boolean; error?: string; status?: number } {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return { ok: false, error: "CRON_SECRET not configured", status: 500 };
  if (!secret || secret !== expected) return { ok: false, error: "Invalid secret", status: 403 };
  return { ok: true };
}
import { prisma } from "@/src/lib/db";
import { sendEmail } from "@/src/lib/email/resend";
import { claimDripEmailDay0, claimDripEmailDay2, claimDripEmailDay5 } from "@/src/lib/email/templates/claim-drip";
import { normalizeLang } from "@/src/lib/i18n/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron job to send claim drip emails
 * Runs daily, sends emails at day 0, 2, and 5 after claim submission
 */
export async function GET(req: Request) {
  const guard = requireCronSecret(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  try {
    const now = new Date();
    const day0Threshold = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // Within last 24h
    const day2Threshold = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const day5Threshold = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

    // Find claims that need drip emails
    const claims = await prisma.companyClaim.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          gte: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // Last 6 days
          lte: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isPremium: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            cui: true,
            romcScore: true,
          },
        },
      },
    });

    let sentDay0 = 0;
    let sentDay2 = 0;
    let sentDay5 = 0;
    let errors = 0;

    for (const claim of claims) {
      if (!claim.user.email) continue;

      const daysSinceClaim = Math.floor((now.getTime() - claim.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      const lang = normalizeLang("ro"); // Default to RO, could be stored per user

      try {
        // Check if email was already sent (via KV or DB flag)
        // For simplicity, we'll use a simple time-based check
        // In production, track sent emails in DB or KV

        if (daysSinceClaim === 0) {
          // Day 0: Confirmation email (already sent on claim, but we can resend if needed)
          // Skip - already sent on claim submission
        } else if (daysSinceClaim === 2) {
          // Day 2: What affects your score
          const email = claimDripEmailDay2(lang, claim.company.name, claim.company.slug, claim.company.romcScore);
          await sendEmail({ to: claim.user.email, subject: email.subject, text: email.text });
          sentDay2++;
        } else if (daysSinceClaim === 5) {
          // Day 5: Premium pitch
          const email = claimDripEmailDay5(lang, claim.company.name, claim.company.slug, claim.user.isPremium);
          await sendEmail({ to: claim.user.email, subject: email.subject, text: email.text });
          sentDay5++;
        }
      } catch (error) {
        console.error(`[claim-drip] Error sending email for claim ${claim.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: claims.length,
      sentDay0,
      sentDay2,
      sentDay5,
      errors,
    });
  } catch (error) {
    console.error("[claim-drip] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

