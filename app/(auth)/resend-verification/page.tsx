"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";

export default function ResendVerificationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || cooldown > 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess(data.message || "Verification email sent. Please check your inbox.");
        setCooldown(60); // Start 60 second cooldown
        
        // Countdown timer
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || "Failed to resend verification email");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Resend Verification Email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email address and we'll send you a new verification link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={loading || cooldown > 0}
          autoComplete="email"
        />

        <Button type="submit" disabled={loading || cooldown > 0} className="w-full">
          {loading
            ? "Sending..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend Verification Email"}
        </Button>
      </form>

      <div className="mt-6 space-y-2 text-sm">
        <div>
          <Link className="text-primary underline underline-offset-4 hover:text-primary/80" href="/login">
            Already verified? Sign in
          </Link>
        </div>
        <div>
          <Link className="text-primary underline underline-offset-4 hover:text-primary/80" href="/register">
            Need to register? Create an account
          </Link>
        </div>
        <div>
          <Link className="underline underline-offset-4" href="/ro">
            Back to RO
          </Link>
        </div>
      </div>
    </main>
  );
}

