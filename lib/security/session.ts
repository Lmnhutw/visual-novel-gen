import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient, isAuthRequired, isSessionCookie } from "@/lib/supabase/session";

export function sessionClientForRequest(cookieStore: Awaited<ReturnType<typeof cookies>>, writable = true) {
  return createSessionClient({
    getAll: () => cookieStore.getAll(),
    setAll: writable
      ? (updates) => {
          for (const { name, value, options } of updates) cookieStore.set(name, value, options);
        }
      : () => {},
  });
}

export const getSessionUser = cache(async (writable = false) => {
  const cookieStore = await cookies();
  if (!cookieStore.getAll().some(isSessionCookie)) return null;
  const { data, error } = await sessionClientForRequest(cookieStore, writable).auth.getUser();
  return error ? null : data.user;
});

export async function requirePageUser() {
  const user = await getSessionUser();
  if (!user && isAuthRequired()) redirect("/login");
  return user;
}
