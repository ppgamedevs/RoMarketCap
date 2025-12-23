import Link from "next/link";
import { getLangFromRequest } from "@/src/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

export default async function RateLimitedPage() {
  const lang = await getLangFromRequest();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "ro" ? "Prea multe solicitări" : "Too many requests"}
          </h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {lang === "ro"
              ? "Ați depășit limita de solicitări. Vă rugăm să încercați din nou mai târziu."
              : "You've exceeded the rate limit. Please try again later."}
          </p>
          <div className="flex gap-3">
            <Link href="/">
              <Button>{lang === "ro" ? "Acasă" : "Home"}</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

