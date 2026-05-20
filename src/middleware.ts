import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const SESSION_COOKIE = "pm-session";
const PROTECTED_PATHS = ["/api/ai", "/api/whisper"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Session cookie management ---
  let sessionId = request.cookies.get(SESSION_COOKIE)?.value;

  // For protected API endpoints, enforce session + rate limit.
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected) {
    // Defensive: reject if no session cookie at all.
    if (!sessionId) {
      return NextResponse.json(
        { error: "未授权：缺少会话凭证" },
        { status: 401 }
      );
    }

    // Rate limit per session.
    if (!checkRateLimit(sessionId, 30)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试（每分钟最多 30 次）" },
        { status: 429 }
      );
    }
  }

  // If no session cookie yet, set one on the response.
  const response = NextResponse.next();

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, _next, etc.
     * This ensures the session cookie is set on the first page visit
     * and that API routes are protected.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
