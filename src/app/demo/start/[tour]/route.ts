import { NextResponse } from "next/server";
import { isDemo } from "@/lib/config";
import { TOUR_COOKIE, tourByKey } from "@/lib/demo/tours";
import { PERSONAS } from "@/lib/demo/personas";
import { mainDemoDossierId } from "@/lib/demo/main";

/** Start een tour: log in als de juiste rol en ga naar de eerste stap. */
export async function GET(req: Request, { params }: { params: Promise<{ tour: string }> }) {
  if (!isDemo()) return new Response("Niet beschikbaar", { status: 404 });
  const t = tourByKey((await params).tour);
  if (!t) return new Response("Onbekende tour", { status: 404 });
  const main = await mainDemoDossierId();
  const first = `${t.steps[0].path.replace("{main}", main ?? "")}?tour=${t.key}&step=0`;
  const via = t.persona === "anoniem" ? "uit" : PERSONAS.find((p) => p.key === t.persona)?.key;
  const res = NextResponse.redirect(new URL(`/demo/als/${via}?next=${encodeURIComponent(first)}`, req.url));
  // De lopende tour geeft toegang tot de pagina's van die tour (zie src/proxy.ts).
  res.cookies.set(TOUR_COOKIE, t.key, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
