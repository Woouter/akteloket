import { NextResponse } from "next/server";
import { z } from "zod";
import { currentDraft, toReviewPayload } from "@/lib/domain/aanvraag";
import { applyReview } from "@/lib/domain/intake";
import { loadDossierView } from "@/lib/domain/dossier";

const Person = z.object({ voornamen: z.string().optional(), achternaam: z.string().optional(), geboortedatum: z.string().optional(), geboorteplaats: z.string().optional(), adres: z.string().optional(), postcode: z.string().optional(), woonplaats: z.string().optional(), burgerlijkeStaat: z.enum(["ongehuwd", "gehuwd", "geregistreerd_partner", "gescheiden", "weduwe"]).optional(), partnerNaam: z.string().optional() }).passthrough();
const Body = z.object({
  property: z.object({ straat: z.string().optional(), huisnummer: z.string().optional(), toevoeging: z.string().optional(), postcode: z.string().optional(), plaats: z.string().optional(), soort: z.enum(["woning", "appartement", "bouwgrond", "overig"]).optional(), kadastraal: z.object({ gemeente: z.string().optional(), sectie: z.string().optional(), perceel: z.string().optional(), appartementsindex: z.string().optional(), grootte: z.string().optional() }).partial().optional() }),
  transaction: z.object({ koopprijs: z.number().optional(), roerendeZaken: z.number().optional(), datumOndertekening: z.string().optional(), leveringsdatum: z.string().optional(), waarborgsomBedrag: z.number().optional() }),
  parties: z.array(z.object({ id: z.string().optional(), side: z.enum(["koper", "verkoper"]), person: Person, email: z.string().optional() })),
});

const clean = <T extends Record<string, unknown>>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== null)) as T;

export async function POST(req: Request) {
  const draft = await currentDraft();
  if (!draft) return NextResponse.json({ error: "Je aanvraag is verlopen. Begin opnieuw." }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Controleer de ingevulde velden", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  if (!b.parties.some((p) => p.side === "koper")) return NextResponse.json({ error: "Voeg minimaal één koper toe" }, { status: 400 });
  await applyReview(draft.dossier.id, { property: clean({ ...b.property, kadastraal: clean(b.property.kadastraal ?? {}) }), transaction: clean(b.transaction), parties: b.parties.map((p) => ({ ...p, person: clean(p.person) })) }, "klant (aanvraag)");
  return NextResponse.json({ payload: toReviewPayload((await loadDossierView(draft.dossier.id))!) });
}
