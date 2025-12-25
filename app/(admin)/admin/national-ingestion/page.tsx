import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { NationalIngestionClient } from "./NationalIngestionClient";

export default async function NationalIngestionPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login");
  }

  return <NationalIngestionClient />;
}

