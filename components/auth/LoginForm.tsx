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

  useEffect(() => {
    // Check what providers are available
    getProviders().then(setProviders).catch((err) => {
      console.error("Error getting providers:", err);
      setError("Failed to load authentication providers");
    });
  }, []);

  const handleGitHubSignIn = async () => {
    if (!githubAvailable) {
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

  const githubAvailable = providers && "github" in providers;

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
          {!githubAvailable && (
            <Alert variant="warning">
              GitHub authentication is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">Sign in with your GitHub account.</p>
          {githubAvailable ? (
            <>
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
            </>
          ) : (
            <>
              <Button disabled className="w-full">
                Sign in with GitHub (Not Available)
              </Button>
              <p className="text-xs text-muted-foreground">
                GitHub provider not available. Check server logs or environment variables.
              </p>
            </>
          )}
        </div>
      </TabPanel>
    </div>
  );
}
