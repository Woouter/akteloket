import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { CheckCircle2, MessageSquareText } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { saveFeedback } from "../actions";
import { Badge, Card, Notice } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export const metadata: Metadata = { title: "Beoordelingskader pilot", robots: { index: false } };

/** Te valideren onderdelen (procesdocument §15), aangevuld met de onderdelen die in de bouw zijn uitgewerkt. */
const ITEMS: { key: string; title: string; now: string }[] = [
  { key: "Minimale startgegevens", title: "Minimale startgegevens", now: "Dienst, getekende KO ja/nee, upload, controle van uitgelezen gegevens, naam/e-mail/telefoon/adres/rol, vier verklaringen en digitale handtekening (getypte naam)." },
  { key: "Automatische extractie", title: "Automatische extractie in plaats van dubbele uitvraag", now: "Scanner haalt partijen, object, kadastrale aanduiding, bedragen, data, voorbehouden en bijzondere bepalingen uit de KO; klant bevestigt; wijzigingen worden gelogd met oorspronkelijke waarde." },
  { key: "Identificatie", title: "Identificatie", now: "iDIN of NFC-ID-app per betrokkene, status te starten / in behandeling / voltooid, vergelijking naam + geboortedatum met KO. Geen ID-kopieën per mail." },
  { key: "Wwft-documentmatrix", title: "Bewijsdocumenten en documentregels per Wwft-bron", now: "Voorlopige matrix uit het procesdocument, met drempelbedragen; aanpasbaar onder Notaris → Instellingen. Status na indienen: ‘Wwft-informatie aangeleverd’." },
  { key: "Gecombineerde volmacht", title: "Tekst, reikwijdte en formaliteiten van de gecombineerde volmacht", now: "Eén volmacht voor levering + hypotheek aan iedere medewerker van het kantoor, ondertekend tijdens een video- of kantoorafspraak (15 min). Concepttekst gegenereerd; reikwijdte hypotheek vóór offerte als controlepunt." },
  { key: "Verkoopvolmacht", title: "Eenvoudige verkoopvolmacht en legalisatie", now: "Video-afspraak of legalisatieroute (download, laten legaliseren, upload + origineel per post). Instelling per kantoor: niet vereist / keuze / altijd." },
  { key: "Hypotheekinstructie", title: "Aanlevering en veilige deling van de hypotheekinstructie", now: "Geldverstrekker → notaris; notaris uploadt in de werkplek → automatische extractie → concept-hypotheekakte → aanvullende dossieroverdracht. Status nog niet verwacht / verwacht / ontvangen / in behandeling." },
  { key: "Bankmodellen", title: "Geldverstrekker-specifieke modelakten", now: "Generiek model met de bankteksten uit de instructie; controlepunt om het verplichte model van de geldverstrekker te gebruiken. Per bank een model toevoegen in de clausulebibliotheek." },
  { key: "Model leveringsakte", title: "Model concept-leveringsakte en clausulebibliotheek", now: "Comparitie met gevolmachtigde, koopovereenkomst, levering, koopprijs/kwijting, verkrijgingstitel, lasten en beperkingen uit vorige akte (incl. kettingbeding), bepalingen uit KO, ontbindende voorwaarden, overdrachtsbelasting per koper, woonplaatskeuze, slot." },
  { key: "Startersvrijstelling", title: "Toets en verklaring startersvrijstelling", now: "Per koper: leeftijd op leveringsdatum, woningwaardegrens per jaar (geen vaste bedragen), drie vragen, verklaring ter ondertekening, uitkomst per aandeel." },
  { key: "Termijnen en herinneringen", title: "Termijnen en herinneringen", now: "Datumcheck 14 dagen vooraf, herinnering na 3 dagen, signaal aan notaris na nog 2 dagen; bankinstructie uiterlijk 10 dagen vooraf; herinneringen max. eens per 3 dagen." },
  { key: "Aflosnota's", title: "Aflosnota's, royement en nota van afrekening verkoper", now: "Hypotheken uit Kadaster → aflosnota op te vragen; verkoper vult leningnummer + toestemming; notaris verzendt verzoek met één klik, registreert bedrag; nota verkoper automatisch." },
  { key: "Dossieroverdracht", title: "Inhoud en moment van de dossieroverdracht", now: "Overdracht 1 als koperskant compleet en concept-leveringsakte klaar; aanvulling bij hypotheekakte; alle onderdelen uit hoofdstuk 11 + ZIP." },
  { key: "DVO en tarieven", title: "Dienstverleningsovereenkomst, rolverdeling en tarieven", now: "Notaris als opdrachtnemer, Akteloket als verwerker; vaste all-in prijzen (€ 1.395 / € 995 / € 695), geen betaling vooraf, kosteloos annuleren tot concept-akte." },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ opgeslagen?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const fb = await db.select().from(schema.feedback).orderBy(desc(schema.feedback.createdAt));
  const tone = { akkoord: "ok", aanpassen: "warn", schrappen: "bad", toevoegen: "brand" } as const;
  return (
    <div className="container-page max-w-5xl py-12">
      <p className="eyebrow">Beoordelingskader pilot</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Per onderdeel: akkoord, aanpassen, schrappen of toevoegen</h1>
      <p className="mt-4 text-lg text-ink-600">Dit is geen open vragenlijst: alles is al uitgewerkt en werkt in deze demo. Geef per onderdeel uw oordeel; wij verwerken het in de definitieve inrichting.</p>
      {sp.opgeslagen && <Notice tone="ok" className="mt-6" icon={<CheckCircle2 className="h-4 w-4 text-ok-600" />}>Uw beoordeling van “{sp.opgeslagen}” is opgeslagen.</Notice>}
      <div className="mt-10 space-y-5">
        {ITEMS.map((it) => {
          const mine = fb.filter((f) => f.component === it.key);
          return (
            <Card key={it.key} id={it.key} className="scroll-mt-24 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-serif text-lg font-semibold text-ink-900">{it.title}</h2>{mine[0] && <Badge tone={tone[mine[0].verdict]}>{mine[0].verdict}</Badge>}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-600"><strong className="text-ink-800">Zoals gebouwd:</strong> {it.now}</p>
              <form action={saveFeedback} className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                <input type="hidden" name="component" value={it.key} />
                <fieldset className="flex flex-wrap gap-1.5"><legend className="sr-only">Uw oordeel over {it.title}</legend>
                  {(["akkoord", "aanpassen", "schrappen", "toevoegen"] as const).map((v) => <label key={v} className="cursor-pointer"><input type="radio" name="verdict" value={v} required defaultChecked={mine[0]?.verdict === v} className="peer sr-only" /><span className="btn btn-secondary btn-sm capitalize peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-checked:text-white peer-focus-visible:shadow-[var(--shadow-focus)] peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">{v}</span></label>)}
                </fieldset>
                <textarea name="comment" rows={1} className="textarea" placeholder="Toelichting (optioneel)" aria-label={`Toelichting bij ${it.title}`} />
                <button className="btn btn-dark btn-sm">Opslaan</button>
              </form>
              {mine.length > 0 && <ul className="mt-4 space-y-2 border-t border-ink-100 pt-3">{mine.map((f) => <li key={f.id} className="flex gap-2 text-xs text-ink-600"><MessageSquareText className="h-3.5 w-3.5 shrink-0 text-ink-400" /><span><strong>{f.author}</strong>, {f.verdict}, {dateTimeNl(f.createdAt)}{f.comment ? `: ${f.comment}` : ""}</span></li>)}</ul>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
