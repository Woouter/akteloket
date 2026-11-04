import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { DRAFT_COOKIE, currentDraft } from "@/lib/domain/aanvraag";
import { finalizeAanvraag } from "@/lib/domain/intake";
import { createSession } from "@/lib/auth/session";
import { runAutomations } from "@/lib/automation/engine";
import { sendMail } from "@/lib/integrations/email";
import { SERVICES } from "@/lib/config";
import { siteUrl } from "@/lib/util/site";
import { propertyLine } from "@/lib/util/format";
import { DVO_CHECKS } from "@/lib/docgen/dvo";

const Body = z.object({
  name: z.string().min(3, "Vul je volledige naam in"),
  email: z.string().email("Vul een geldig e-mailadres in"),
  phone: z.string().min(8, "Vul je telefoonnummer in"),
  adres: z.string().optional(),
  rol: z.enum(["koper", "mede_koper", "vertegenwoordiger"]),
  checks: z.array(z.string()),
  signatureName: z.string().min(3, "Onderteken met je volledige naam"),
});

export async function POST(req: Request) {
  const draft = await currentDraft();
  if (!draft) return NextResponse.json({ error: "Je aanvraag is verlopen. Begin opnieuw." }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Controleer je gegevens" }, { status: 400 });
  const b = parsed.data;
  const missing = DVO_CHECKS.filter((c) => !b.checks.includes(c.key));
  if (missing.length) return NextResponse.json({ error: "Vink alle verklaringen aan om je aanvraag te bevestigen" }, { status: 400 });
  const h = await headers();
  const { user } = await finalizeAanvraag(draft.dossier.id, { ...b, ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined, userAgent: h.get("user-agent") ?? undefined, hasKo: draft.data.koStatus !== "ontbreekt" });
  await createSession(user.id);
  (await cookies()).delete(DRAFT_COOKIE);
  await sendMail({
    to: user.email, dossierId: draft.dossier.id, template: "koper.welkom",
    subject: `Je aanvraag ${draft.dossier.reference} is ontvangen`,
    heading: `Welkom bij Akteloket, ${b.name.split(" ")[0]}!`,
    intro: `We hebben je aanvraag voor ${SERVICES[draft.data.service].name.toLowerCase()}${draft.data.property.straat ? ` voor ${propertyLine(draft.data.property)}` : ""} ontvangen. Je dossiernummer is ${draft.dossier.reference}.`,
    paragraphs: [draft.data.koStatus === "ontbreekt" ? "Zodra je de getekende koopovereenkomst uploadt, starten we met je dossier." : "We zijn direct aan de slag gegaan: de kadastrale stukken worden opgehaald en de verkoper ontvangt een eigen uitnodiging. In je portaal zie je welke stappen nog voor je klaarstaan."],
    cta: { label: "Naar mijn portaal", href: `${siteUrl()}/portaal/${draft.dossier.id}` },
  });
  runAutomations(draft.dossier.id, "aanvraag afgerond").catch(() => undefined);
  return NextResponse.json({ redirect: `/portaal/${draft.dossier.id}?welkom=1` });
}
