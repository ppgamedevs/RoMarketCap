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
    let cancelled = false;

    // Check GitHub availability from server (has access to actual env vars)
    // This is the authoritative source
    fetch("/api/auth/providers")
      .then((res) => {
        if (cancelled) return;
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) {
          setGitHubAvailable(data.hasGitHub === true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error checking providers from server:", err);
        // If server check fails, fall back to client-side check
      });

    // Get providers from client-side (for UI) - this has the correct type
    getProviders()
      .then((clientProviders) => {
        if (cancelled) return;
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
        if (cancelled) return;
        console.error("Error getting providers:", err);
        // Default to false if we can't determine availability
        setGitHubAvailable((prev) => prev ?? false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Removed handleGitHubSignIn - using direct link instead (more reliable)

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
          <a 
            href="/api/auth/signin/github?callbackUrl=/billing"
            className="block w-full"
          >
            <Button 
              type="button"
              className="w-full"
            >
              Sign in with GitHub
            </Button>
          </a>
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
