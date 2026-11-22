import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithGoogle, signUp } from "@/app/auth/actions";
import { AuthSubmitButton } from "@/components/auth/submit-button";
import { getSessionUser } from "@/lib/security/session";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const [{ error }, user] = await Promise.all([searchParams, getSessionUser()]);
  if (user) redirect("/library");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <section className="w-full space-y-6" aria-labelledby="register-title">
        <h1 id="register-title" className="text-3xl font-semibold">Create your Narrative Studio account</h1>
        <form action={signUp} className="space-y-4">
          {error === "credentials" && <p role="alert">Enter a valid email and a password between 8 and 1024 characters.</p>}
          {error === "password-mismatch" && <p role="alert">Passwords do not match. Try again.</p>}
          {error === "signup" && <p role="alert">Unable to create an account. Try again with a stronger password, or sign in if you already have an account.</p>}
          <label className="block space-y-1">
            <span>Email</span>
            <input className="w-full rounded border border-outline bg-surface px-3 py-2" name="email"
              type="email" autoComplete="username" maxLength={254} required />
          </label>
          <label className="block space-y-1">
            <span>Password</span>
            <input className="w-full rounded border border-outline bg-surface px-3 py-2" name="password"
              type="password" autoComplete="new-password" minLength={8} maxLength={1024} aria-describedby="password-hint" required />
          </label>
          <p id="password-hint" className="text-sm text-on-surface-variant">Use at least 8 characters.</p>
          <label className="block space-y-1">
            <span>Confirm password</span>
            <input className="w-full rounded border border-outline bg-surface px-3 py-2" name="confirmPassword"
              type="password" autoComplete="new-password" minLength={8} maxLength={1024} required />
          </label>
          <AuthSubmitButton pendingLabel="Creating account…">Create account</AuthSubmitButton>
        </form>
        <form action={signInWithGoogle}>
          <AuthSubmitButton variant="secondary" pendingLabel="Connecting to Google…">Continue with Google</AuthSubmitButton>
        </form>
        <p className="text-sm text-on-surface-variant">
          Already have an account? <Link href="/login" className="font-medium text-primary underline underline-offset-4">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
