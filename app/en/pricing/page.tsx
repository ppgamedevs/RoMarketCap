import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default function EnPricingRedirect() {
  redirect(`/lang?lang=en&next=${encodeURIComponent("/pricing")}`);
}


