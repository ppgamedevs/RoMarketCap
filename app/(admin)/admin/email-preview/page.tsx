import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { EmailPreviewClient } from "./EmailPreviewClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminEmailPreviewPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Email Templates Preview</h1>
      <p className="mt-2 text-sm text-muted-foreground">Preview email templates with sample data (no sending).</p>

      <div className="mt-6">
        <EmailPreviewClient />
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/launch">
          Launch Control
        </Link>
      </div>
    </main>
  );
}

