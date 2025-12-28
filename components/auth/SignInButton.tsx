"use client";

import Link from "next/link";

export function SignInButton() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
    >
      Sign In
    </Link>
  );
}


