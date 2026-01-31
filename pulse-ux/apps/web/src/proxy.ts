import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy for authentication checks.
 * Protects dashboard routes and redirects unauthenticated users to login.
 */

const PUBLIC_PATHS = ["/", "/login", "/register"];
const AUTH_COOKIE_NAME = "pulse_authenticated";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const isAuthenticated = request.cookies.get(AUTH_COOKIE_NAME)?.value === "true";

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
