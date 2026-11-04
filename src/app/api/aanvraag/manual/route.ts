import { NextResponse } from "next/server";
import { z } from "zod";
import { currentDraft, toReviewPayload } from "@/lib/domain/aanvraag";
import { loadDossierView, updateDossier } from "@/lib/domain/dossier";
import { applyReview } from "@/lib/domain/intake";

const Body = z.object({
  straat: z.string().min(1), huisnummer: z.string().min(1), toevoeging: z.string().optional(), postcode: z.string().min(4), plaats: z.string().min(1),
  perceel: z.string().optional(), koopprijs: z.number().optional(), leveringsdatum: z.string().optional(), verkoper: z.string().optional(),
  geldverstrekker: z.string().optional(), koperVoornamen: z.string().optional(), koperAchternaam: z.string().optional(),
});

export async function POST(req: Request) {
  const draft = await currentDraft();
  if (!draft) return NextResponse.json({ error: "Je aanvraag is verlopen. Begin opnieuw." }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Vul het adres van de woning in" }, { status: 400 });
  const b = parsed.data;
  const parties = [] as { side: "koper" | "verkoper"; person: { voornamen?: string; achternaam?: string } }[];
  if (b.koperVoornamen || b.koperAchternaam) parties.push({ side: "koper", person: { voornamen: b.koperVoornamen, achternaam: b.koperAchternaam } });
  if (b.verkoper) { const parts = b.verkoper.trim().split(/\s+/); parties.push({ side: "verkoper", person: { voornamen: parts.slice(0, -1).join(" "), achternaam: parts.slice(-1)[0] } }); }
  await applyReview(draft.dossier.id, {
    property: { straat: b.straat, huisnummer: b.huisnummer, toevoeging: b.toevoeging, postcode: b.postcode.toUpperCase().replace(/^(\d{4})\s?([A-Z]{2})$/, "$1 $2"), plaats: b.plaats, kadastraal: b.perceel ? parsePerceel(b.perceel) : undefined },
    transaction: { koopprijs: b.koopprijs, leveringsdatum: b.leveringsdatum },
    parties: parties.length ? parties : draft.parties.map((p) => ({ id: p.id, side: p.side, person: p.data.person })),
  }, "klant (aanvraag zonder KO)");
  await updateDossier(draft.dossier.id, (d) => { d.koStatus = "ontbreekt"; if (b.geldverstrekker) { d.financing.geldverstrekker = b.geldverstrekker; d.financing.hypotheek = "ja"; } d.meta["handmatig"] = { source: "klant" }; });
  return NextResponse.json({ payload: toReviewPayload((await loadDossierView(draft.dossier.id))!) });
}

function parsePerceel(code: string) {
  const m = code.match(/^([A-Z0-9]+)-([A-Z]{1,2})-(\d+)/);
  return m ? { gemeente: m[1], sectie: m[2], perceel: m[3] } : undefined;
}
