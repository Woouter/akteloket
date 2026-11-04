import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createConceptDossier } from "@/lib/domain/intake";
import { DRAFT_COOKIE, currentDraft } from "@/lib/domain/aanvraag";
import { updateDossier } from "@/lib/domain/dossier";
import { token } from "@/lib/util/ids";
import { isDemo } from "@/lib/config";

const Body = z.object({ service: z.enum(["beide", "levering", "hypotheek"]) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Kies een dienst" }, { status: 400 });
  const existing = await currentDraft();
  if (existing) {
    if (existing.data.service !== parsed.data.service) await updateDossier(existing.dossier.id, (d) => { d.service = parsed.data.service; });
    return NextResponse.json({ dossierId: existing.dossier.id });
  }
  const t = token(24);
  const id = await createConceptDossier(parsed.data.service, t, isDemo());
  (await cookies()).set(DRAFT_COOKIE, t, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 86400, secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES });
  return NextResponse.json({ dossierId: id });
}
