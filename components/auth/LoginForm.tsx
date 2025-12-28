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
    // Check what providers are available
    // Prioritize server-side endpoint as it has access to actual env vars
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.providers) {
          // Convert server response to client-side provider format
          const providerMap = Object.fromEntries(
            data.providers.map((p: { id: string; name: string }) => [
              p.id,
              { id: p.id, name: p.name },
            ])
          );
          setProviders(providerMap);
          setGitHubAvailable(data.hasGitHub === true);
        } else {
          // Fallback to client-side check
          return getProviders().then((clientProviders) => {
            setProviders(clientProviders);
            setGitHubAvailable(clientProviders ? "github" in clientProviders : false);
          });
        }
      })
      .catch(() => {
        // Fallback to client-side check if server fails
        getProviders()
          .then((clientProviders) => {
            setProviders(clientProviders);
            setGitHubAvailable(clientProviders ? "github" in clientProviders : false);
          })
          .catch((err) => {
            console.error("Error getting providers:", err);
            // Default to allowing GitHub (server confirmed it's available)
            setGitHubAvailable(true);
          });
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
