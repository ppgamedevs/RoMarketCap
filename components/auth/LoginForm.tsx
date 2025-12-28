"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import { EmailPasswordForm } from "./EmailPasswordForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Alert } from "@/components/ui/Alert";

export function LoginForm() {
  const [activeTab, setActiveTab] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getProviders>>>(null);
  const [githubAvailable, setGitHubAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Check GitHub availability from server (has access to actual env vars)
    // This is the authoritative source
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setGitHubAvailable(data.hasGitHub === true);
        }
      })
      .catch(() => {
        // If server check fails, fall back to client-side check
      });

    // Get providers from client-side (for UI) - this has the correct type
    getProviders()
      .then((clientProviders) => {
        setProviders(clientProviders);
        // Only use client-side result if server check hasn't set a value yet
        setGitHubAvailable((prev) => {
          if (prev === null && clientProviders) {
            return "github" in clientProviders;
          }
          return prev;
        });
      })
      .catch((err) => {
        console.error("Error getting providers:", err);
        // Default to true if server confirmed it's available, otherwise false
        setGitHubAvailable((prev) => prev ?? false);
      });
  }, []);

  const handleGitHubSignIn = async () => {
    if (isGitHubAvailable === false) {
      setError("GitHub authentication is not available");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // signIn with redirect: true will redirect immediately, so we won't get a result
      // If it fails, NextAuth will redirect to /login?error=...
      await signIn("github", { 
        callbackUrl: "/billing",
        redirect: true,
      });
      // If we reach here, something went wrong (should have redirected)
      setLoading(false);
    } catch (error) {
      console.error("GitHub sign-in exception:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      setLoading(false);
    }
  };

  // Use state value if set, otherwise fallback to providers check
  const isGitHubAvailable = githubAvailable !== null ? githubAvailable : (providers && "github" in providers);

  return (
    <div className="w-full">
      <Tabs
        tabs={[
          { id: "email", label: "Email" },
          { id: "github", label: "GitHub" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        className="w-full"
      />
      <TabPanel hidden={activeTab !== "email"}>
        <EmailPasswordForm mode="login" />
      </TabPanel>
      <TabPanel hidden={activeTab !== "github"}>
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {isGitHubAvailable === false && (
            <Alert variant="warning">
              <div className="space-y-2">
                <div>GitHub authentication is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables in Vercel.</div>
                <div className="text-xs">
                  Check <a href="/api/auth/providers" target="_blank" className="underline">/api/auth/providers</a> to see what providers are registered.
                </div>
              </div>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">Sign in with your GitHub account.</p>
          <Button 
            onClick={handleGitHubSignIn} 
            disabled={loading} 
            className="w-full"
          >
            {loading ? "Redirecting..." : "Sign in with GitHub"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Or{" "}
            <a 
              href="/api/auth/signin/github?callbackUrl=/billing" 
              className="underline hover:text-primary"
            >
              click here to sign in directly
            </a>
          </p>
          {isGitHubAvailable === null && (
            <p className="text-xs text-muted-foreground">
              Checking GitHub authentication availability...
            </p>
          )}
        </div>
      </TabPanel>
    </div>
  );
}
