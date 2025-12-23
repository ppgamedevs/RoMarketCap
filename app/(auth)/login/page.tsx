import Link from "next/link";
import { SignInButton } from "@/components/auth/SignInButton";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in to access billing and admin.</p>

      <div className="mt-6">
        <SignInButton />
      </div>

      <div className="mt-6 text-sm">
        <Link className="underline underline-offset-4" href="/ro">
          Back to RO
        </Link>
      </div>
    </main>
  );
}


