import Link from "next/link";
import { getLangFromRequest } from "@/src/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

export default async function UnauthorizedPage() {
  const lang = await getLangFromRequest();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "ro" ? "Acces restricționat" : "Access restricted"}
          </h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {lang === "ro"
              ? "Nu aveți permisiunea de a accesa această pagină."
              : "You don't have permission to access this page."}
          </p>
          <div className="flex gap-3">
            <Link href="/login">
              <Button>{lang === "ro" ? "Autentificare" : "Sign in"}</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">{lang === "ro" ? "Acasă" : "Home"}</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

