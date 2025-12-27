"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { EmailPasswordForm } from "./EmailPasswordForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/Tabs";

export function LoginForm() {
  const [activeTab, setActiveTab] = useState("email");
  const [loading, setLoading] = useState(false);

  const handleGitHubSignIn = async () => {
    setLoading(true);
    await signIn("github", { callbackUrl: "/billing" });
  };

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
          <p className="text-sm text-muted-foreground">Sign in with your GitHub account.</p>
          <Button onClick={handleGitHubSignIn} disabled={loading} className="w-full">
            {loading ? "Redirecting..." : "Sign in with GitHub"}
          </Button>
        </div>
      </TabPanel>
    </div>
  );
}

