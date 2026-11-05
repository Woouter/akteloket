import { sql } from "drizzle-orm";
import { Play } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { runCronAction } from "../actions";
import { PageTitle } from "@/components/staff/shell";
import { Card, Notice } from "@/components/ui";

type Count = { events?: string[]; mails?: string[]; notas?: true };
const RULES: [string, string, string, Count][] = [
  ["Koopovereenkomst uitlezen", "Bij upload", "Tekstlaag + AI/regels → object, partijen, koopprijs, data, waarborgsom, voorbehouden, bijzondere bepalingen; per veld pagina, citaat en zekerheid.", { events: ["ko.uitgelezen"] }],
  ["Dossier starten", "Na DVO + getekende KO", "Status naar intake; inhoudelijke uitvraag wordt geopend.", { events: ["dossier.gestart"] }],
  ["Verkopers uitnodigen", "Na DVO + KO + bekende e-mail", "Persoonlijke uitnodiging per verkoper; contactgegevens worden niet als actueel aangenomen.", { events: ["verkoper.uitgenodigd"] }],
  ["Kadaster raadplegen", "Object eenduidig geïdentificeerd", "Eigendomsinformatie, kaart, vorige akte; registraties → erfdienstbaarheden, kwalitatieve verplichtingen, hypotheken (→ aflosnota's); vergelijking rechthebbenden ↔ verkopers.", { events: ["kadaster.opgehaald"] }],
  ["Startersvrijstelling toetsen", "Geboortedatum + koopprijs + leveringsdatum", "Per koper: leeftijd op leveringsdatum en woningwaardegrens van dat jaar.", { events: ["starters.toets"] }],
  ["Bankinstructie verwachten", "Financiering geaccepteerd/rond", "Status 'verwacht'; signaal als instructie uitblijft.", { events: ["bank.verwacht"] }],
  ["Concept-leveringsakte", "KO verwerkt + kadaster opgehaald", "Model + clausulebibliotheek, bronverwijzingen en controlepunten; nieuwe versie bij gewijzigde gegevens.", { events: ["akte.levering"] }],
  ["Concept-hypotheekakte", "Bankinstructie gedeeld door notaris", "Alleen bankteksten uit de instructie; afwijkingen als controlepunt.", { events: ["akte.hypotheek"] }],
  ["Volmachten klaarzetten", "Gegevens bevestigd", "Gecombineerde volmacht koper; eenvoudige verkoopvolmacht verkoper.", { events: ["volmacht.koper", "volmacht.verkoper"] }],
  ["Verklaring startersvrijstelling", "Koper komt in aanmerking en wil gebruiken", "Verklaring per koper ter ondertekening.", { events: ["starters.verklaring"] }],
  ["Nota's van afrekening", "Doorlopend", "Concept-nota koper/verkoper incl. OB per koper, OZB-verrekening, aflossingen.", { notas: true }],
  ["Verzoek aflosnota voorbereiden", "Toestemming verkoper", "Brief aan geldverstrekker; notaris verstuurt met één klik.", { events: ["aflosnota.voorbereid"] }],
  ["Dossieroverdracht", "Koper compleet + concept-akte", "Overdracht 1 aan notaris; aanvullende overdracht bij hypotheekakte.", { events: ["overdracht.1", "overdracht.aanvulling"] }],
  ["Datumcontrole", "14 dagen vóór levering", "Vraag aan koper; herinnering na 3 dagen; signaal aan notaris na nog 2 dagen.", { events: ["datum.gevraagd", "datum.herinnering", "datum.signaal"] }],
  ["Herinneringen", "Dagelijks", "Vriendelijk en specifiek ('We missen nog …'), maximaal eens per 3 dagen per persoon.", { mails: ["koper.herinnering", "verkoper.herinnering"] }],
];

export default async function Page({ searchParams }: { searchParams: Promise<{ gedraaid?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const counts = await db.select({ type: schema.events.type, n: sql<number>`count(*)::int` }).from(schema.events).groupBy(schema.events.type);
  const mailCounts = await db.select({ template: schema.emails.template, n: sql<number>`count(*)::int` }).from(schema.emails).groupBy(schema.emails.template);
  const dossiers = await db.select({ data: schema.dossiers.data }).from(schema.dossiers);
  const ev = new Map(counts.map((r) => [r.type, r.n]));
  const ml = new Map(mailCounts.map((r) => [r.template, r.n]));
  // Nota's worden doorlopend herberekend (niet als losse gebeurtenis gelogd): tel de dossiers met een concept-nota.
  const notas = dossiers.filter((d) => d.data?.notaKoper || d.data?.notaVerkoper).length;
  const count = (k: Count) => (k.notas ? notas : 0) + (k.events ?? []).reduce((n, t) => n + (ev.get(t) ?? 0), 0) + (k.mails ?? []).reduce((n, t) => n + (ml.get(t) ?? 0), 0);
  return (
    <>
      <PageTitle title="Automatisering" sub="Elke regel draait na iedere wijziging in een dossier en daarnaast dagelijks (termijnbewaking en herinneringen). Een regel die al is uitgevoerd, wordt niet dubbel uitgevoerd." actions={<form action={runCronAction}><button className="btn btn-primary btn-sm"><Play className="h-4 w-4" />Draai termijnbewaking nu</button></form>} />
      {sp.gedraaid && <Notice tone="ok" className="mb-4">Termijnbewaking en herinneringen gedraaid voor alle lopende dossiers.</Notice>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs font-semibold uppercase tracking-wider text-ink-500"><tr><th className="p-4">Regel</th><th className="p-4">Trigger</th><th className="p-4">Wat er gebeurt</th><th className="p-4 text-right" title="Aantal keer uitgevoerd sinds de start (bij nota's: dossiers met een concept-nota)">Uitgevoerd</th></tr></thead>
          <tbody className="divide-y divide-ink-100">{RULES.map(([r, t, w, k]) => <tr key={r}><td className="p-4 font-semibold text-ink-900">{r}</td><td className="p-4 text-ink-600">{t}</td><td className="p-4 text-ink-600">{w}</td><td className="p-4 text-right font-medium text-ink-900 tabular">{count(k)}</td></tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}
