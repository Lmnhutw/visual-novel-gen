import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient, isSessionCookie } from "@/lib/supabase/session";

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const pageRequest = !request.nextUrl.pathname.startsWith("/api/");

  // Refresh on page loads because Server Components cannot write cookies.
  if (pageRequest && request.method === "GET" && request.cookies.getAll().some(isSessionCookie)) {
    const auth = createSessionClient({
      getAll: () => request.cookies.getAll(),
      setAll: (updates, headers) => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        requestHeaders.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of updates) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    }).auth;
    await auth.getClaims();
  }

  response.headers.set("x-request-id", requestId);
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/library/:path*", "/login"],
};
