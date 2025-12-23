import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { getSiteUrl } from "@/lib/seo/site";
import { LaunchChecklistClient } from "./LaunchChecklistClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLaunchChecklistPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const base = getSiteUrl();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Launch Checklist</h1>
      <p className="mt-2 text-sm text-muted-foreground">Step-by-step validation for production readiness.</p>

      <div className="mt-6">
        <LaunchChecklistClient baseUrl={base} />
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin/launch">
          Launch Control
        </Link>
        <Link className="underline underline-offset-4" href="/admin/flags">
          Feature Flags
        </Link>
        <Link className="underline underline-offset-4" href="/admin/ops">
          Ops
        </Link>
      </div>
    </main>
  );
}
