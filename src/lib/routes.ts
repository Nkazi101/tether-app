export type AppView = "feed" | "collections" | "curations" | "explore" | "profile" | "following";

export const appRoutes = {
  landing: "/",
  auth: "/auth",
  updatePassword: "/update-password",
  onboarding: "/onboarding",
  feed: "/feed",
  collections: "/collections",
  curations: "/curations",
  explore: "/explore",
  profile: "/profile",
  deepDive: "/deep-dive",
  following: "/following",
} as const;

export type AuthMode = "sign-in" | "sign-up" | "forgot-password";

export function sanitizeNextPath(next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(next, "http://tether.local");
    if (url.origin !== "http://tether.local") {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function buildAuthPath(
  next?: string | null,
  mode: AuthMode = "sign-in"
) {
  const params = new URLSearchParams();
  const safeNext = sanitizeNextPath(next);

  if (safeNext && safeNext !== appRoutes.auth) {
    params.set("next", safeNext);
  }

  if (mode !== "sign-in") {
    params.set("mode", mode);
  }

  const query = params.toString();
  return query ? `${appRoutes.auth}?${query}` : appRoutes.auth;
}

export function getAppViewFromPathname(pathname: string): AppView | null {
  if (pathname.startsWith('/following')) return 'following';
  if (pathname === '/' || pathname.startsWith('/comparisons') || pathname.startsWith('/requests')) return 'explore';
  if (pathname.startsWith(appRoutes.feed)) return "feed";
  if (pathname.startsWith(appRoutes.collections)) return "collections";
  if (pathname.startsWith(appRoutes.curations)) return "curations";
  if (pathname.startsWith(appRoutes.explore) || pathname.startsWith(appRoutes.deepDive)) {
    return "explore";
  }
  if (pathname.startsWith(appRoutes.profile)) return "profile";
  return null;
}

export function buildDeepDivePath(
  modernEvent: string,
  historicalEvent: string,
  from?: string | null
) {
  const params = new URLSearchParams({
    modern: modernEvent,
    historical: historicalEvent,
  });

  if (from) {
    params.set("from", from);
  }

  return `${appRoutes.deepDive}?${params.toString()}`;
}
