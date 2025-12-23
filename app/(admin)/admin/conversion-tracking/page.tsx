import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConversionTrackingChecks } from "@/components/admin/ConversionTrackingChecks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ConversionTrackingPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Conversion Tracking Sanity Checks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verify that conversion events are being tracked correctly across the platform.
        </p>
      </div>

      <ConversionTrackingChecks />
    </main>
  );
}

