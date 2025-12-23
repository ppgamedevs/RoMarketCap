import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default function EnHomeRedirect() {
  redirect(`/lang?lang=en&next=${encodeURIComponent("/ro")}`);
}


