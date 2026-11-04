import { sql } from "drizzle-orm";
import { Play } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { runCronAction } from "../actions";
import { PageTitle } from "@/components/staff/shell";
import { Card, Notice } from "@/components/ui";

const RULES = [
  ["Koopovereenkomst uitlezen", "Bij upload", "Tekstlaag + AI/regels → object, partijen, koopprijs, data, waarborgsom, voorbehouden, bijzondere bepalingen; per veld pagina, citaat en zekerheid.", "ko.uitgelezen"],
  ["Dossier starten", "Na DVO + getekende KO", "Status naar intake; inhoudelijke uitvraag wordt geopend.", "dossier.gestart"],
  ["Verkopers uitnodigen", "Na DVO + KO + bekende e-mail", "Persoonlijke uitnodiging per verkoper; contactgegevens worden niet als actueel aangenomen.", "verkoper.uitgenodigd"],
  ["Kadaster raadplegen", "Object eenduidig geïdentificeerd", "Eigendomsinformatie, kaart, vorige akte; registraties → erfdienstbaarheden, kwalitatieve verplichtingen, hypotheken (→ aflosnota's); vergelijking rechthebbenden ↔ verkopers.", "kadaster.opgehaald"],
  ["Startersvrijstelling toetsen", "Geboortedatum + koopprijs + leveringsdatum", "Per koper: leeftijd op leveringsdatum en woningwaardegrens van dat jaar.", "starters.toets"],
  ["Bankinstructie verwachten", "Financiering geaccepteerd/rond", "Status 'verwacht'; signaal als instructie uitblijft.", "bank.verwacht"],
  ["Concept-leveringsakte", "KO verwerkt + kadaster opgehaald", "Model + clausulebibliotheek, bronverwijzingen en controlepunten; nieuwe versie bij gewijzigde gegevens.", "akte.levering"],
  ["Concept-hypotheekakte", "Bankinstructie gedeeld door notaris", "Alleen bankteksten uit de instructie; afwijkingen als controlepunt.", "akte.hypotheek"],
  ["Volmachten klaarzetten", "Gegevens bevestigd", "Gecombineerde volmacht koper; eenvoudige verkoopvolmacht verkoper.", "volmacht.koper"],
  ["Verklaring startersvrijstelling", "Koper komt in aanmerking en wil gebruiken", "Verklaring per koper ter ondertekening.", "starters.verklaring"],
  ["Nota's van afrekening", "Doorlopend", "Concept-nota koper/verkoper incl. OB per koper, OZB-verrekening, aflossingen.", "nota.beschikbaar"],
  ["Verzoek aflosnota voorbereiden", "Toestemming verkoper", "Brief aan geldverstrekker; notaris verstuurt met één klik.", "aflosnota.voorbereid"],
  ["Dossieroverdracht", "Koper compleet + concept-akte", "Overdracht 1 aan notaris; aanvullende overdracht bij hypotheekakte.", "overdracht.1"],
  ["Datumcontrole", "14 dagen vóór levering", "Vraag aan koper; herinnering na 3 dagen; signaal aan notaris na nog 2 dagen.", "datum.gevraagd"],
  ["Herinneringen", "Dagelijks (cron)", "Vriendelijk en specifiek ('We missen nog …'), maximaal eens per 3 dagen per persoon.", "koper.herinnering"],
];

export default async function Page({ searchParams }: { searchParams: Promise<{ gedraaid?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const counts = await db.select({ type: schema.events.type, n: sql<number>`count(*)::int` }).from(schema.events).groupBy(schema.events.type);
  const c = new Map(counts.map((r) => [r.type, r.n]));
  return (
    <>
      <PageTitle title="Automatisering" sub="Alle regels zijn idempotent en draaien na elke wijziging én periodiek via /api/cron." actions={<form action={runCronAction}><button className="btn btn-primary btn-sm"><Play className="h-4 w-4" />Draai termijnbewaking nu</button></form>} />
      {sp.gedraaid && <Notice tone="ok" className="mb-4">Termijnbewaking en herinneringen gedraaid voor alle lopende dossiers.</Notice>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs font-semibold uppercase tracking-wider text-ink-500"><tr><th className="p-4">Regel</th><th className="p-4">Trigger</th><th className="p-4">Wat er gebeurt</th><th className="p-4 text-right">Uitgevoerd</th></tr></thead>
          <tbody className="divide-y divide-ink-100">{RULES.map(([r, t, w, ev]) => <tr key={r}><td className="p-4 font-semibold text-ink-900">{r}</td><td className="p-4 text-ink-600">{t}</td><td className="p-4 text-ink-600">{w}</td><td className="p-4 text-right font-mono tabular">{c.get(ev) ?? 0}</td></tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}
