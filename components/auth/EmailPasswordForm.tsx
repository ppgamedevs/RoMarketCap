"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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
        setEmail("");
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
          if (onSuccess) {
            setTimeout(() => onSuccess(), 500);
          } else {
            window.location.href = "/billing";
          }
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

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
        />
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Please wait..." : mode === "register" ? "Register" : "Sign In"}
      </Button>
    </form>
  );
}

