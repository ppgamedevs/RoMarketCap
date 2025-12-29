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
  const [email, setEmail] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

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
          // Try to extract email from error or use stored email
          if (data.email) {
            setEmail(data.email);
          }
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("An error occurred. Please try again.");
      });
  }, [searchParams, router]);

  const handleResendVerification = async () => {
    if (!email || resendCooldown > 0) return;

    setResending(true);
    setResendError(null);
    setResendSuccess(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setResendSuccess(data.message || "Verification email sent. Please check your inbox.");
        setResendCooldown(60); // Start 60 second cooldown
        
        // Countdown timer
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setResendError(data.error || "Failed to resend verification email");
      }
    } catch (err) {
      setResendError("An error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

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
            
            {email && (
              <div className="space-y-2">
                {resendSuccess && <Alert variant="success">{resendSuccess}</Alert>}
                {resendError && <Alert variant="error">{resendError}</Alert>}
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? We can resend it to <strong>{email}</strong>
                </p>
                <Button
                  onClick={handleResendVerification}
                  disabled={resending || resendCooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {resending
                    ? "Sending..."
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Verification Email"}
                </Button>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <p>You can also:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check if the link has expired (links expire after 24 hours)</li>
                <li>Check your spam folder</li>
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

