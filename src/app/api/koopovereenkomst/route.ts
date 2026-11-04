import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { createConceptDossier } from "@/lib/domain/intake";
import { emptyPartyData, logEvent, updateDossier } from "@/lib/domain/dossier";
import { findOrCreateUser } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { runAutomations } from "@/lib/automation/engine";
import { sendMail } from "@/lib/integrations/email";
import { isDemo, DVO_VERSION } from "@/lib/config";
import { token, uid } from "@/lib/util/ids";
import { siteUrl } from "@/lib/util/site";

const P = z.object({ voornamen: z.string().min(1), achternaam: z.string().min(1), geboortedatum: z.string().optional(), email: z.string().optional() });
const Body = z.object({
  rol: z.enum(["koper", "verkoper"]),
  straat: z.string().min(1), huisnummer: z.string().min(1), postcode: z.string().min(4), plaats: z.string().min(1), perceel: z.string().optional(),
  kopers: z.array(P).min(1), verkopers: z.array(P).min(1),
  koopprijs: z.number().positive(), roerendeZaken: z.number().optional(), leveringsdatum: z.string().min(8),
  waarborgsom: z.number().optional(), waarborgType: z.enum(["waarborgsom", "bankgarantie"]).optional(), waarborgUiterlijk: z.string().optional(),
  financiering: z.boolean(), financieringBedrag: z.number().optional(), financieringDatum: z.string().optional(), nhg: z.boolean().optional(),
  keuring: z.boolean(), keuringDatum: z.string().optional(), afspraken: z.string().optional(),
  naam: z.string().min(3), email: z.string().email(), telefoon: z.string().min(8), akkoord: z.literal(true),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0] ? `Controleer: ${parsed.error.issues[0].path.join(".")}` : "Controleer de gegevens" }, { status: 400 });
  const b = parsed.data;
  const db = await getDb();
  const id = await createConceptDossier("koopovereenkomst", token(), isDemo());
  const pm = b.perceel?.match(/^([A-Z0-9]+)-([A-Z]{1,2})-(\d+)/);
  await updateDossier(id, (d) => {
    d.property = { straat: b.straat, huisnummer: b.huisnummer, postcode: b.postcode, plaats: b.plaats, soort: "woning", kadastraal: pm ? { gemeente: pm[1], sectie: pm[2], perceel: pm[3] } : undefined };
    d.transaction = { koopprijs: b.koopprijs, roerendeZaken: b.roerendeZaken, leveringsdatum: b.leveringsdatum, leveringsdatumOrigineel: b.leveringsdatum, leveringsdatumStatus: "voorlopig", waarborgsom: b.waarborgsom ? { bedrag: b.waarborgsom, type: b.waarborgType ?? "waarborgsom", uiterlijk: b.waarborgUiterlijk } : undefined, financieringsvoorbehoud: b.financiering ? { bedrag: b.financieringBedrag, datum: b.financieringDatum, nhg: b.nhg } : undefined, overigeVoorbehouden: b.keuring ? [{ omschrijving: "Bouwkundige keuring", datum: b.keuringDatum }] : [], bijzondereBepalingen: b.afspraken ? b.afspraken.split(/\n+/).filter(Boolean).map((t, i) => ({ titel: `Afspraak ${i + 1}`, tekst: t })) : [] };
    d.koopovereenkomst = { status: "concept" };
    d.koStatus = "ontbreekt";
    d.dvo = { version: DVO_VERSION, acceptedAt: new Date().toISOString(), acceptedBy: b.email, signatureName: b.naam, checks: ["akkoord"] };
    return { status: "intake", draftToken: null };
  });
  const user = await findOrCreateUser(b.email, b.naam, "klant", b.telefoon);
  const insert = async (side: "koper" | "verkoper", list: z.infer<typeof P>[]) => {
    for (const [i, p] of list.entries()) {
      const isMe = side === b.rol && i === 0;
      await db.insert(schema.parties).values({ id: uid(), dossierId: id, side, isPrimary: i === 0, position: i, userId: isMe ? user.id : null, email: isMe ? b.email : p.email ?? null, phone: isMe ? b.telefoon : null, displayName: `${p.voornamen} ${p.achternaam}`, activatedAt: isMe ? new Date() : null, data: { ...emptyPartyData(), person: { voornamen: p.voornamen, achternaam: p.achternaam, geboortedatum: p.geboortedatum }, eigendom: side === "koper" && list.length > 1 ? { aandeel: `1/${list.length}`, verhouding: "gelijk" } : undefined } });
    }
  };
  await insert("koper", b.kopers);
  await insert("verkoper", b.verkopers);
  await logEvent({ dossierId: id, actorType: "klant", actor: user, type: "ko.aanvraag", message: `Aanvraag koopovereenkomst ingediend door ${b.naam} (${b.rol}).`, visibleTo: "partijen" });
  await createSession(user.id);
  await sendMail({ to: b.email, dossierId: id, template: "ko.welkom", subject: "We stellen je koopovereenkomst op", heading: "Je koopovereenkomst is in de maak", intro: `We stellen de koopovereenkomst voor ${b.straat} ${b.huisnummer}, ${b.plaats} op. Na juridische controle kunnen koper en verkoper digitaal tekenen.`, cta: { label: "Naar mijn portaal", href: `${siteUrl()}/portaal/${id}` } });
  await runAutomations(id, "ko-aanvraag");
  return NextResponse.json({ redirect: `/portaal/${id}?welkom=1` });
}
