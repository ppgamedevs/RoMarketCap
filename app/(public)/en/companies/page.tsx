import { redirect } from "next/navigation";

export default function LegacyEnCompaniesRedirect() {
  redirect(`/lang?lang=en&next=${encodeURIComponent("/company")}`);
}


