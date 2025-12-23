import { ImageResponse } from "next/og";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const c = await prisma.company.findUnique({
    where: { slug },
    select: {
      name: true,
      romcScore: true,
      romcAiScore: true,
      valuationRangeLow: true,
      valuationRangeHigh: true,
      valuationCurrency: true,
    },
  });

  const name = c?.name ?? "Company";
  const romc = c?.romcScore ?? null;
  const ai = c?.romcAiScore ?? null;
  const vLow = c?.valuationRangeLow ? Number(String(c.valuationRangeLow)) : null;
  const vHigh = c?.valuationRangeHigh ? Number(String(c.valuationRangeHigh)) : null;
  const vText = vLow != null && vHigh != null ? `${Math.round(vLow)}-${Math.round(vHigh)} ${c?.valuationCurrency ?? "EUR"}` : "N/A";

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
          <div style={{ fontSize: 14, opacity: 0.7 }}>Estimated values</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
          <div style={{ display: "flex", gap: 18, fontSize: 22, opacity: 0.9 }}>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
              ROMC v1: {romc != null ? `${romc}/100` : "N/A"}
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
              ROMC AI: {ai != null ? `${ai}/100` : "N/A"}
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
              Valuation: {vText}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, opacity: 0.7 }}>
          <div>romarketcap.ro</div>
          <div>Not financial advice</div>
        </div>
      </div>
    ),
    { width: size.width, height: size.height },
  );
}


