import { ImageResponse } from "next/og";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function topMoversLast30Days() {
  const now = new Date();
  const since = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const rows =
    (await prisma.$queryRaw<
      Array<{ slug: string; name: string; delta: number }>
    >`
    WITH firsts AS (
      SELECT DISTINCT ON (h.company_id) h.company_id, h.romc_score AS from_score
      FROM company_score_history h
      WHERE h.recorded_at >= ${since}
      ORDER BY h.company_id, h.recorded_at ASC
    ),
    lasts AS (
      SELECT DISTINCT ON (h.company_id) h.company_id, h.romc_score AS to_score
      FROM company_score_history h
      WHERE h.recorded_at >= ${since}
      ORDER BY h.company_id, h.recorded_at DESC
    )
    SELECT c.slug, c.name, (l.to_score - f.from_score) as delta
    FROM companies c
    JOIN firsts f ON f.company_id = c.id
    JOIN lasts l ON l.company_id = c.id
    WHERE c.is_public = true AND c.visibility_status = 'PUBLIC'
    ORDER BY delta DESC
    LIMIT 5
  `) ?? [];
  return rows;
}

export default async function OGImage() {
  const movers = await topMoversLast30Days();
  const date = new Date().toISOString().slice(0, 10);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#0b1220",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, opacity: 0.9 }}>RoMarketCap</div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>{date}</div>
        </div>

        <div>
          <div style={{ fontSize: 54, fontWeight: 700 }}>Market Movers</div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10, fontSize: 24, opacity: 0.9 }}>
            {movers.length === 0 ? (
              <div style={{ opacity: 0.7 }}>N/A</div>
            ) : (
              movers.map((m) => (
                <div key={m.slug} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 760 }}>{m.name}</div>
                  <div style={{ opacity: 0.8 }}>{m.delta.toFixed(1)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, opacity: 0.7 }}>
          <div>romarketcap.ro</div>
          <div>Estimates</div>
        </div>
      </div>
    ),
    { width: size.width, height: size.height },
  );
}


