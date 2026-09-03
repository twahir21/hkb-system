import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Mirror Auth.js's own `useSecureCookies ?? url.protocol === "https:"` decision
 * (auth.ts writes a `__Secure-`/Secure session cookie when AUTH_URL is https,
 * so the proxy MUST read the same cookie name or the gate always sees no token).
 */
const isSecureCookies = (): boolean => {
  const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Next.js 16 renamed middleware → proxy. This is a lightweight UX gate only;
 * all real authorization is re-verified server-side in lib/auth/dal.ts.
 */
export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecureCookies(),
  });
  const { pathname } = request.nextUrl;

  const isBypassed =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next");

  // Signed-in users hitting /login bounce to the dashboard.
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!token && !isBypassed) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|ico|svg|jpg|jpeg|webp)$).*)"],
};