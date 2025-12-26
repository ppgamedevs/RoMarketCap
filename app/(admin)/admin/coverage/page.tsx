import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { CoverageClient } from "./CoverageClient";

export default async function CoveragePage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login");
  }

  return <CoverageClient />;
}

