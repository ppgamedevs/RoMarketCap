"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              We encountered a critical error. Our team has been notified.
            </p>
            {process.env.NODE_ENV === "development" && error.message && (
              <div className="rounded-md bg-muted p-3 text-left">
                <p className="text-xs font-mono text-destructive">{error.message}</p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={reset}>Try again</Button>
              <Link href="/">
                <Button variant="outline">Go home</Button>
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

