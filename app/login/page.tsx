import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithGoogle } from "@/app/auth/actions";
import { AuthSubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/security/session";
import { signIn, signOut } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ error, message }, user] = await Promise.all([searchParams, getSessionUser()]);
  if (user && error !== "sign-out") redirect("/library");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <section className="w-full space-y-6" aria-labelledby="login-title">
        <h1 id="login-title" className="text-3xl font-semibold">Sign in to Narrative Studio</h1>
        {user ? (
          <form action={signOut} className="space-y-4">
            <p role="alert">We couldn’t sign you out. Try again.</p>
            <Button type="submit">Sign out</Button>
          </form>
        ) : (
          <>
            {message === "check-email" && <p role="status">Check your email for a confirmation link, then return here to sign in. If you already have an account, you can sign in now.</p>}
            {message === "account-created" && <p role="status">Your account is ready. Sign in with your email and password.</p>}
            {error === "google" && <p role="alert">Unable to connect to Google. Try again or sign in with email and password.</p>}
            {error === "confirmation" && <p role="alert">Unable to complete sign-in or email verification. The link may have expired. Try signing in again.</p>}
            <form action={signIn} className="space-y-4">
              {error === "credentials" && <p role="alert">Unable to sign in with that email and password.</p>}
              <label className="block space-y-1">
                <span>Email</span>
                <input className="w-full rounded border border-outline bg-surface px-3 py-2" name="email"
                  type="email" autoComplete="username" maxLength={254} required />
              </label>
              <label className="block space-y-1">
                <span>Password</span>
                <input className="w-full rounded border border-outline bg-surface px-3 py-2" name="password"
                  type="password" autoComplete="current-password" maxLength={1024} required />
              </label>
              <AuthSubmitButton pendingLabel="Signing in…">Sign in</AuthSubmitButton>
            </form>
            <form action={signInWithGoogle}>
              <AuthSubmitButton variant="secondary" pendingLabel="Connecting to Google…">Continue with Google</AuthSubmitButton>
            </form>
            <p className="text-sm text-on-surface-variant">
              New to Narrative Studio? <Link href="/register" className="font-medium text-primary underline underline-offset-4">Create an account</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
