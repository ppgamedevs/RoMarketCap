import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default function EnAboutRedirect() {
  redirect(`/lang?lang=en&next=${encodeURIComponent("/about")}`);
}


