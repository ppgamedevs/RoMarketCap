import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { ProvidersClient } from "./ProvidersClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProvidersPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login");
  }

  return <ProvidersClient />;
}

