"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AUTO_VERIFY_EMAIL } from "@/lib/auth/config";
import { sessionClientForRequest } from "@/lib/security/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(1024),
  confirmPassword: z.string().max(1024),
});

async function getCallbackUrl() {
  // Next.js validates the Origin against the host before running a Server Action.
  const origin = (await headers()).get("origin");
  if (!origin) throw new Error("Missing request origin.");
  const url = new URL(origin);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid request origin.");
  return new URL("/auth/callback", url.origin).toString();
}

async function registerWithPassword({ email, password }: z.infer<typeof registrationSchema>) {
  const client = sessionClientForRequest(await cookies());

  if (AUTO_VERIFY_EMAIL) {
    const { data, error } = await getSupabaseAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) return "/register?error=signup";

    const login = await client.auth.signInWithPassword({ email, password }).catch(() => null);
    return login && !login.error && login.data.session ? "/library" : "/login?message=account-created";
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await getCallbackUrl() },
  });
  if (error) return "/register?error=signup";
  return data.session ? "/library" : "/login?message=check-email";
}

export async function signUp(formData: FormData) {
  const credentials = registrationSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!credentials.success) redirect("/register?error=credentials");
  if (credentials.data.password !== credentials.data.confirmPassword) redirect("/register?error=password-mismatch");

  const destination = await registerWithPassword(credentials.data).catch(() => "/register?error=signup");
  redirect(destination);
}

export async function signInWithGoogle() {
  let destination = "/login?error=google";
  try {
    const client = sessionClientForRequest(await cookies());
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: await getCallbackUrl(), skipBrowserRedirect: true },
    });
    if (!error && data.url) destination = data.url;
  } catch {
    // Keep configuration and provider errors out of the public response.
  }
  redirect(destination);
}
