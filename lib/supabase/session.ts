import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

const sessionCookieName = "vng-session";

export function isAuthRequired() {
  return process.env.NODE_ENV === "production" || process.env.REQUIRE_AUTH !== "false";
}

export function getSupabaseAuthConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth configuration is missing.");
  return { url, key };
}

export function isSessionCookie({ name }: { name: string }) {
  return name === sessionCookieName || name.startsWith(`${sessionCookieName}.`);
}

export function createSessionClient(cookies: CookieMethodsServer) {
  const { url, key } = getSupabaseAuthConfig();
  return createServerClient(url, key, {
    cookies,
    cookieOptions: {
      name: sessionCookieName,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  });
}
