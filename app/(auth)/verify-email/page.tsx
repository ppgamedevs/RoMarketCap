"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("An error occurred. Please try again.");
      });
  }, [searchParams, router]);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Verify Email</h1>

      <div className="mt-6">
        {status === "loading" && (
          <Alert variant="info">Verifying your email address...</Alert>
        )}
        {status === "success" && (
          <div className="space-y-4">
            <Alert variant="success">{message}</Alert>
            <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-4">
            <Alert variant="error">{message}</Alert>
            <div className="space-y-2 text-sm">
              <p>You can:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check if the link has expired (links expire after 24 hours)</li>
                <li>Try registering again</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/register")} variant="outline" className="flex-1">
                Register Again
              </Button>
              <Button onClick={() => router.push("/login")} variant="outline" className="flex-1">
                Go to Login
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm">
        <Link className="underline underline-offset-4" href="/ro">
          Back to RO
        </Link>
      </div>
    </main>
  );
}

