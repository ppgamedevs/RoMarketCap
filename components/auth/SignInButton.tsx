"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      onClick={() => signIn("github", { callbackUrl: "/billing" })}
      type="button"
    >
      Sign in with GitHub
    </button>
  );
}


