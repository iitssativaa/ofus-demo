import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return withSecurityHeaders(NextResponse.next({ request }));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser validates and refreshes the cookie-backed session when necessary.
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/giris" || pathname === "/kayit";
  const isAuthCallback = pathname.startsWith("/auth/callback");

  if (isAuthCallback) return withSecurityHeaders(response);
  if (!user && !isAuthPage) {
    const redirectResponse = NextResponse.redirect(new URL("/giris", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return withSecurityHeaders(redirectResponse);
  }
  if (user && isAuthPage) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return withSecurityHeaders(redirectResponse);
  }
  return withSecurityHeaders(response);
}
