import { NextResponse, type NextRequest } from "next/server";
import { SEEN_COOKIE, TOUR_COOKIE, demoPathAllowed, parseSeen, tourByKey } from "@/lib/demo/tours";

/**
 * Demo-omgeving: alleen te gebruiken via tours.
 *
 * Wie op demo.akte-loket.nl binnenkomt, belandt op de tourkeuze (/demo). Andere pagina's
 * zijn bereikbaar tijdens een tour en, na afloop, binnen het deel dat die tour uitlegde.
 * Wie vrij wil rondkijken, gaat naar de echte website. In productie doet dit niets.
 * Uitzetten (bijv. lokaal ontwikkelen): DEMO_GATE=uit.
 */
export function proxy(req: NextRequest) {
  if (process.env.APP_MODE === "production" || process.env.DEMO_GATE === "uit") return NextResponse.next();
  if (req.method !== "GET" && req.method !== "HEAD") return NextResponse.next();

  const { pathname, searchParams } = req.nextUrl;
  const active = tourByKey(req.cookies.get(TOUR_COOKIE)?.value)?.key;
  const seen = parseSeen(req.cookies.get(SEEN_COOKIE)?.value);
  if (demoPathAllowed(pathname, active, seen)) return NextResponse.next();

  // Een directe tourlink (?tour=…) naar een pagina uit die tour: tour starten.
  const linked = tourByKey(searchParams.get("tour"));
  if (linked && demoPathAllowed(pathname, linked.key, [])) {
    const res = NextResponse.next();
    res.cookies.set(TOUR_COOKIE, linked.key, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = "/demo";
  url.search = pathname === "/" ? "" : `?van=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Geen API-routes, Next-bestanden of statische bestanden (alles met een extensie).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
