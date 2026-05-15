import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "./config";

export default async function middleware(request: NextRequest) {
  // Check for the session cookie
  // Cookie prefix configured in Better Auth is 'dimensional', so name is 'dimensional.session_token'
  const sessionCookie = request.cookies.get("__Secure-dimensional.session_token") || request.cookies.get("dimensional.session_token");

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  if (!sessionCookie) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is logged in and trying to access auth pages, let them be.
  // We avoid redirecting to "/" here to prevent infinite loops if the session cookie is stale.
  // The client-side logic or server-side page logic can handle redirecting away from auth pages if needed.
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Validate session server-side to ensure cookie isn't stale/expired
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/session`, {
      method: "GET",
      headers: {
        // Forward cookies for Better Auth to read session
        cookie: request.headers.get("cookie") || "",
      },
      // Middleware runs on the edge; no need for credentials mode
      // but we explicitly forward cookie header above.
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    // On network/API failures, fail closed for protected pages
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.svg).*)",
  ],
};
