import { type NextRequest, NextResponse } from "next/server";

import { DASHBOARD_HOME } from "@/features/dairy/lib/constants";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/login"];
const LEGACY_PATHS = ["/admin", "/member"];

function copyCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie.name, cookie.value, cookie);
  }

  return target;
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  source: NextResponse,
) {
  const target = NextResponse.redirect(new URL(pathname, request.url));

  return copyCookies(source, target);
}

function matchesPath(pathname: string, patterns: string[]) {
  return patterns.some((pattern) => {
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  });
}

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublicPath = matchesPath(pathname, PUBLIC_PATHS);
  const isLegacyPath = matchesPath(pathname, LEGACY_PATHS);

  if (claims && (pathname === "/" || pathname === "/login" || isLegacyPath)) {
    return redirectWithCookies(request, DASHBOARD_HOME, response);
  }

  if (!claims && !isPublicPath) {
    return redirectWithCookies(request, "/login", response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
