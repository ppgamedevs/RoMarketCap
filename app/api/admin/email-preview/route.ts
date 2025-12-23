import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";
import { getSiteUrl } from "@/lib/seo/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TemplateSchema = z.enum(["test", "watchlist-alert", "weekly-digest", "claim-status", "submission-status", "partner-lead"]);

export async function GET(req: Request) {
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
  const typeParam = url.searchParams.get("type");
  const parsed = TemplateSchema.safeParse(typeParam);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid template type" }, { status: 400, headers: rl.headers });
  }

  const type = parsed.data;
  const base = getSiteUrl();

  // Sample data for previews
  const sampleCompany = {
    name: "Demo Company SRL",
    slug: "demo-company-srl",
    cui: "12345678",
    romcScore: 75,
    romcAiScore: 72,
  };

  let subject = "";
  let html = "";
  let text = "";

  switch (type) {
    case "test": {
      subject = "RoMarketCap Test Email";
      html = "<p>This is a test email from the launch checklist.</p>";
      text = "This is a test email from the launch checklist.";
      break;
    }

    case "watchlist-alert": {
      subject = "Alertă: Schimbare scor pentru Demo Company SRL";
      html = `
        <p>Compania <strong>${sampleCompany.name}</strong> din watchlist-ul tău a înregistrat o schimbare de scor.</p>
        <p>Scor ROMC AI: <strong>72</strong> (schimbare: +5)</p>
        <p><a href="${base}/company/${sampleCompany.slug}">Vezi detalii</a></p>
      `;
      text = `Compania ${sampleCompany.name} din watchlist-ul tău a înregistrat o schimbare de scor.\nScor ROMC AI: 72 (schimbare: +5)\nVezi detalii: ${base}/company/${sampleCompany.slug}`;
      break;
    }

    case "weekly-digest": {
      subject = "RoMarketCap Weekly Digest - Săptămâna 2024-01-15";
      html = `
        <h2>Weekly Digest</h2>
        <p>Top movers this week:</p>
        <ul>
          <li>Demo Company SRL: +5%</li>
          <li>Another Company: +3%</li>
        </ul>
        <p><a href="${base}/digest/2024-01-15">Vezi digest complet</a></p>
      `;
      text = `Weekly Digest\nTop movers this week:\n- Demo Company SRL: +5%\n- Another Company: +3%\nVezi digest complet: ${base}/digest/2024-01-15`;
      break;
    }

    case "claim-status": {
      subject = "Status cerere claim: Demo Company SRL";
      html = `
        <p>Cererea ta de claim pentru <strong>${sampleCompany.name}</strong> a fost ${Math.random() > 0.5 ? "aprobată" : "respinsă"}.</p>
        <p><a href="${base}/company/${sampleCompany.slug}">Vezi companie</a></p>
      `;
      text = `Cererea ta de claim pentru ${sampleCompany.name} a fost ${Math.random() > 0.5 ? "aprobată" : "respinsă"}.\nVezi companie: ${base}/company/${sampleCompany.slug}`;
      break;
    }

    case "submission-status": {
      subject = "Status submisie: Demo Company SRL";
      html = `
        <p>Submisia ta pentru <strong>${sampleCompany.name}</strong> a fost ${Math.random() > 0.5 ? "aprobată" : "respinsă"}.</p>
        <p><a href="${base}/company/${sampleCompany.slug}">Vezi companie</a></p>
      `;
      text = `Submisia ta pentru ${sampleCompany.name} a fost ${Math.random() > 0.5 ? "aprobată" : "respinsă"}.\nVezi companie: ${base}/company/${sampleCompany.slug}`;
      break;
    }

    case "partner-lead": {
      subject = "New Partner Lead: Demo Company";
      html = `
        <p>New partner lead received:</p>
        <ul>
          <li>Company: Demo Company</li>
          <li>Email: demo@example.com</li>
          <li>Message: Interested in partnership</li>
        </ul>
      `;
      text = `New partner lead received:\nCompany: Demo Company\nEmail: demo@example.com\nMessage: Interested in partnership`;
      break;
    }
  }

  return NextResponse.json({ ok: true, subject, html, text }, { headers: rl.headers });
}

