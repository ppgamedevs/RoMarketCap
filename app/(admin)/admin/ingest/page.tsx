import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { IngestClient } from "./IngestClient";

export default async function IngestPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login");
  }

  return <IngestClient />;
}

