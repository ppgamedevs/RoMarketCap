import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { UniverseClient } from "./UniverseClient";

export default async function UniversePage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login");
  }

  return <UniverseClient />;
}

