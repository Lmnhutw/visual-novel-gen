import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/security/session";
import { signIn, signOut } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ error }, user] = await Promise.all([searchParams, getSessionUser()]);
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
            <Button variant="primary" type="submit">Sign in</Button>
          </form>
        )}
      </section>
    </main>
  );
}
