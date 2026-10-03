import { NextRequest, NextResponse } from "next/server";

const API_URL = (
  process.env.NEXT_PUBLIC_PHP_API_URL ??
  "http://localhost/INVEST%20PR/backend/public/index.php"
).replace(/\/$/, "");

type SessionUser = {
  roles: string[];
};

async function getServerSession(request: NextRequest): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  try {
    const response = await fetch(`${API_URL}?route=auth/me`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: { user?: SessionUser };
    };
    return payload.data?.user ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (isAdminPath && isAdminLogin) return NextResponse.next();

  const user = await getServerSession(request);
  if (!user) {
    const loginUrl = new URL(isAdminPath ? "/admin/login" : "/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath && !user.roles.some((role) => role === "admin" || role === "super_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/activity/:path*",
    "/support/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/transactions/:path*",
    "/invest/:path*",
    "/deposit/:path*",
    "/withdrawal/:path*",
    "/referral/:path*",
    "/referrals/:path*",
    "/admin/:path*",
  ],
};
