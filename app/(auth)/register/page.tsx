import Link from "next/link";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Register for a new account to access billing and admin features.</p>

      <div className="mt-6">
        <EmailPasswordForm mode="register" />
      </div>

      <div className="mt-6 space-y-2 text-sm">
        <div>
          <Link className="text-primary underline underline-offset-4 hover:text-primary/80" href="/login">
            Already have an account? Sign in
          </Link>
        </div>
        <div>
          <Link className="underline underline-offset-4" href="/ro">
            Back to RO
          </Link>
        </div>
      </div>
    </main>
  );
}

