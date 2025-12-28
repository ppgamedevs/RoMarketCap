import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { Alert } from "@/components/ui/Alert";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const errorMessage = sp.error === "CredentialsSignin"
    ? "Invalid email or password."
    : sp.error
    ? `Authentication error: ${sp.error}`
    : null;

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in to access billing and admin.</p>

      {errorMessage && (
        <div className="mt-6">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      <div className="mt-6">
        <LoginForm />
      </div>

      <div className="mt-6 space-y-2 text-sm">
        <div>
          <Link className="text-primary underline underline-offset-4 hover:text-primary/80" href="/register">
            Don't have an account? Register
          </Link>
        </div>
        <div>
          <Link className="text-primary underline underline-offset-4 hover:text-primary/80" href="/forgot-password">
            Forgot your password?
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
