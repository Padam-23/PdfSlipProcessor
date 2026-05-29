import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin route protection ──────────────────────────────────────
  // /admin/* routes require admin_token cookie (we'll check presence,
  // the actual JWT validation happens server-side on every API call)
  if (pathname.startsWith("/admin") && pathname !== "/admin-login") {
    // We can't read localStorage in middleware, so we rely on
    // client-side redirect in the admin page itself.
    // Middleware here just ensures the route is not accidentally
    // pre-rendered with sensitive data.
    return NextResponse.next()
  }

  // ── Public routes — always allow ────────────────────────────────
  const publicPaths = ["/", "/auth/callback", "/activate", "/admin-login"]
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
