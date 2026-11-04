import { NextResponse } from "next/server";
import { isDemo } from "@/lib/config";
import { tourByKey } from "@/lib/demo/tours";
import { PERSONAS } from "@/lib/demo/personas";
import { mainDemoDossierId } from "@/lib/demo/main";

/** Start een tour: log in als de juiste rol en ga naar de eerste stap. */
export async function GET(req: Request, { params }: { params: Promise<{ tour: string }> }) {
  if (!isDemo()) return new Response("Niet beschikbaar", { status: 404 });
  const t = tourByKey((await params).tour);
  if (!t) return new Response("Onbekende tour", { status: 404 });
  const main = await mainDemoDossierId();
  const first = `${t.steps[0].path.replace("{main}", main ?? "")}?tour=${t.key}&step=0`;
  if (t.persona === "anoniem") return NextResponse.redirect(new URL(`/demo/als/uit?next=${encodeURIComponent(first)}`, req.url));
  const persona = PERSONAS.find((p) => p.key === t.persona);
  return NextResponse.redirect(new URL(`/demo/als/${persona?.key}?next=${encodeURIComponent(first)}`, req.url));
}
