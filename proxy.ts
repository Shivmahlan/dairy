import { type NextRequest, NextResponse } from "next/server";

import { DASHBOARD_HOME } from "@/features/dairy/lib/constants";
import { updateSession } from "@/lib/supabase/proxy";

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

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api");

  // Define public paths that bypass Supabase auth
  const isPublicPage = pathname === "/member";
  const isPublicApi = 
    pathname === "/api/member-login" || 
    pathname === "/api/member-logout" || 
    pathname === "/api/member-dashboard" ||
    (pathname === "/api/product-requests" && request.method === "POST");

  const isPublic = isPublicPage || isPublicApi;

  // If logged in to Supabase and hitting / or /login, redirect to admin/members (which is where they manage members)
  // or DASHBOARD_HOME if they use Supabase dashboard
  if (claims && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies(request, DASHBOARD_HOME, response);
  }

  // If not logged in to Supabase and request is not public (and not /login page), block or redirect
  if (!claims && !isPublic && pathname !== "/login") {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized. Administrative access required." },
        { status: 401 }
      );
    }
    return redirectWithCookies(request, "/login", response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
