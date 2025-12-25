import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { ProvidersClient } from "./ProvidersClient";

export default async function ProvidersPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login");
  }

  return <ProvidersClient />;
}

