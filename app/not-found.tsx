import Link from "next/link";
import { getLangFromRequest } from "@/src/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NotFound() {
  const lang = await getLangFromRequest();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "ro" ? "Pagina nu a fost găsită" : "Page not found"}
          </h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {lang === "ro"
              ? "Pagina pe care o căutați nu există sau a fost mutată."
              : "The page you're looking for doesn't exist or has been moved."}
          </p>
          <div className="flex gap-3">
            <Link href="/">
              <Button>{lang === "ro" ? "Acasă" : "Home"}</Button>
            </Link>
            <Link href="/companies">
              <Button variant="outline">{lang === "ro" ? "Companii" : "Companies"}</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

