import { ImageResponse } from "next/og";
import { prisma } from "@/src/lib/db";
import { industryLabel } from "@/src/lib/taxonomy/industries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const count = await prisma.company.count({ where: { isPublic: true, visibilityStatus: "PUBLIC", industrySlug: slug } });
  const label = industryLabel(slug, "ro");

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
          <div style={{ fontSize: 14, opacity: 0.7 }}>Industry</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 54, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 22, opacity: 0.9 }}>
            {count} {count === 1 ? "company" : "companies"}
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


