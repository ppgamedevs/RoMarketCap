"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/Alert";

type EmailPasswordFormProps = {
  mode: "login" | "register";
  onSuccess?: () => void;
};

export function EmailPasswordForm({ mode, onSuccess }: EmailPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "register") {
        // Validate
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        // Register
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "Registration failed");
          setLoading(false);
          return;
        }

        setSuccess(data.message || "Registration successful! Please check your email to verify your account.");
        // Don't clear email - user might want to resend
        setPassword("");
        setConfirmPassword("");
        setName("");
      } else {
        // Login
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          if (result.error === "Email not verified") {
            setError("Please verify your email before logging in. Check your inbox for the verification link.");
          } else {
            setError("Invalid email or password");
          }
          setLoading(false);
          return;
        }

        if (result?.ok) {
          setSuccess("Login successful!");
          // Get session to check if user is admin
          const session = await getSession();
          if (session?.user?.role === "admin") {
            window.location.href = "/admin";
          } else {
            if (onSuccess) {
              setTimeout(() => onSuccess(), 500);
            } else {
              window.location.href = "/billing";
            }
          }
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || resendCooldown > 0) return;

    setResending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess(data.message || "Verification email sent. Please check your inbox.");
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
        setError(data.error || "Failed to resend verification email");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <div className="space-y-2">
          <Alert variant="success">{success}</Alert>
          {mode === "register" && email && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-2">Didn't receive the email?</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendVerification}
                disabled={resending || resendCooldown > 0}
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
        </div>
      )}

      {mode === "register" && (
        <Input
          label="Name (optional)"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={loading}
        />
      )}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={loading}
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
        required
        disabled={loading}
        minLength={mode === "register" ? 8 : undefined}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
      />

      {mode === "register" && (
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={loading}
          autoComplete="new-password"
        />
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Please wait..." : mode === "register" ? "Register" : "Sign In"}
      </Button>
    </form>
  );
}

