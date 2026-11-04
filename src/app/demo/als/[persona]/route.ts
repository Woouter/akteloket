import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isDemo } from "@/lib/config";
import { getDb, schema } from "@/lib/db";
import { PERSONAS } from "@/lib/demo/personas";
import { createSession, destroySession } from "@/lib/auth/session";
import { mainDemoDossierId } from "@/lib/demo/main";
import { safePath } from "@/lib/util/site";

export async function GET(req: Request, { params }: { params: Promise<{ persona: string }> }) {
  if (!isDemo()) return new Response("Niet beschikbaar", { status: 404 });
  const key = (await params).persona;
  const url = new URL(req.url);
  if (key === "uit") { await destroySession(); return NextResponse.redirect(new URL(safePath(url.searchParams.get("next")), req.url)); }
  const p = PERSONAS.find((x) => x.key === key);
  if (!p) return new Response("Onbekende rol", { status: 404 });
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, p.email)).limit(1);
  if (!u) return new Response("Demo-gebruiker niet gevonden — reset de demo", { status: 404 });
  await destroySession();
  await createSession(u.id);
  const main = await mainDemoDossierId();
  const dest = safePath(url.searchParams.get("next"), p.role === "notaris" ? "/notaris" : p.role === "beheer" ? "/beheer" : `/portaal/${main}`);
  return NextResponse.redirect(new URL(dest, req.url));
}
