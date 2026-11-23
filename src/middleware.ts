import { NextResponse, type NextRequest } from "next/server";
import { verifyHs256JwtSoft } from "@/lib/jwt-edge";

const COOKIE_NAME = "timeclock_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;

  const session =
    token && secret && secret.length >= 32
      ? await verifyHs256JwtSoft(token, secret)
      : null;

  const isAuthPage =
    pathname === "/login" || pathname === "/change-password";
  const isAdmin = pathname.startsWith("/admin");
  const isClock = pathname.startsWith("/clock");
  const isApiAdmin = pathname.startsWith("/api/admin");

  if (!session) {
    if (pathname === "/login") {
      return NextResponse.next();
    }
    if (isAuthPage || isAdmin || isClock || isApiAdmin || pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (session.mustChangePassword && pathname !== "/change-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "ADMIN" ? "/admin" : "/clock";
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "ADMIN" ? "/admin" : "/clock";
    return NextResponse.redirect(url);
  }

  if ((isAdmin || isApiAdmin) && session.role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/clock";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/change-password",
    "/clock/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
