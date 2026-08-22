import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required to keep Server Components in sync
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // Safety net for OAuth. If `redirect_to` is not on Supabase's allowlist,
  // Supabase falls back to the configured Site URL and drops the user on a page
  // that never reads the code, so sign-in silently does nothing. Forward any
  // stray code to the handler that knows how to exchange it.
  const STRAY_CODE_PATHS = ["/", "/login", "/register"];
  if (searchParams.has("code") && STRAY_CODE_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isSettings = pathname.startsWith("/settings");
  const isAuth =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  // Unauthenticated user trying to reach a protected page → send to login
  if ((isDashboard || isOnboarding || isSettings) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  /*
   * Settings edits answers that onboarding collects, so there has to be a set of
   * them first. Grouped with the dashboard rather than given its own check —
   * both mean "past the front door", and both belong behind a finished profile.
   */
  // Authenticated user on dashboard but hasn't completed onboarding → redirect to onboarding
  if ((isDashboard || isSettings) && user) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (!prefs?.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // Authenticated user on onboarding but already completed it → send to dashboard
  if (isOnboarding && user) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (prefs?.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Authenticated user hitting auth pages → figure out where they belong
  if (isAuth && user) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = prefs?.onboarding_completed ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
