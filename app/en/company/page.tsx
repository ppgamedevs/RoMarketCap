import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default function EnCompanyRedirectPage() {
  redirect(`/lang?lang=en&next=${encodeURIComponent("/company")}`);
}


