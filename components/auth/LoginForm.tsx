"use client";

import { EmailPasswordForm } from "./EmailPasswordForm";

export function LoginForm() {
  return (
    <div className="w-full">
      <EmailPasswordForm mode="login" />
    </div>
  );
}
