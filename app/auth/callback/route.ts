import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionClientForRequest } from "@/lib/security/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  let authenticated = false;

  if (code && !url.searchParams.has("error")) {
    try {
      const client = sessionClientForRequest(await cookies());
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      authenticated = !error && Boolean(data.session);
    } catch {
      // Invalid, expired or missing PKCE cookies require a fresh sign-in.
    }
  }

  redirect(authenticated ? "/library" : "/login?error=confirmation");
}
