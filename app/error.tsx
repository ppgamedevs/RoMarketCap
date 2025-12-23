"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Our team has been notified and is working on a fix.
          </p>
          {process.env.NODE_ENV === "development" && error.message && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-mono text-destructive">{error.message}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={reset}>Try again</Button>
            <Link href="/">
              <Button variant="outline">Go home</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

