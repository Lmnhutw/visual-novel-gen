import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionClientForRequest } from "@/lib/security/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let authenticated = false;

  if (tokenHash && (type === "signup" || type === "email")) {
    try {
      const client = sessionClientForRequest(await cookies());
      const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
      authenticated = !error && Boolean(data.session);
    } catch {
      // Expired or invalid confirmation links must not grant a session.
    }
  }

  redirect(authenticated ? "/library" : "/login?error=confirmation");
}
