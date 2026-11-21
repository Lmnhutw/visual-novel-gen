"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sessionClientForRequest } from "@/lib/security/session";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});

export async function signIn(formData: FormData) {
  const credentials = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!credentials.success) redirect("/login?error=credentials");

  const client = sessionClientForRequest(await cookies());
  const { data, error } = await client.auth.signInWithPassword(credentials.data);
  if (error || !data.session) redirect("/login?error=credentials");
  redirect("/library");
}

export async function signOut() {
  const client = sessionClientForRequest(await cookies());
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) redirect("/login?error=sign-out");
  redirect("/login");
}
