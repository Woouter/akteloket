import { desc, ilike } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { PageTitle } from "@/components/staff/shell";
import { Badge, Card } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";
import { Notice } from "@/components/ui";
import { listAfmeldingen } from "@/lib/integrations/afmeldingen";
import { afmeldenAction, weerAanmeldenAction } from "../actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; afgemeld?: string; fout?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const db = await getDb();
  const base = db.select().from(schema.emails);
  const mails = await (q ? base.where(ilike(schema.emails.to, `%${q}%`)) : base).orderBy(desc(schema.emails.createdAt)).limit(200);
  const afmeldingen = await listAfmeldingen();
  return (
    <>
      <PageTitle title="Uitgaande e-mail" sub="Alle berichten worden gelogd. Klik op een bericht voor de inhoud. In de demo-omgeving worden ze gesimuleerd en niet echt verzonden." />

      {sp.afgemeld && <Notice tone="ok" className="mb-6">{sp.afgemeld} is afgemeld. Er gaan geen e-mails meer naar dit adres.</Notice>}
      {sp.fout && <Notice tone="bad" className="mb-6">Vul een geldig e-mailadres in.</Notice>}

      <Card className="mb-6 p-5">
        <h2 className="font-serif text-lg font-semibold text-ink-900">Afmeldingen</h2>
        <p className="mt-1 text-sm text-ink-600">Een afgemeld adres krijgt geen herinneringen, uitnodigingen of meldingen meer. Alleen een inloglink die iemand zelf aanvraagt gaat nog wel. Ontvangers kunnen zich ook zelf afmelden via de link onderaan elke e-mail.</p>
        <form action={afmeldenAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block"><span className="label">E-mailadres</span><input name="email" type="email" required className="input" placeholder="naam@voorbeeld.nl" defaultValue={q.includes("@") ? q : undefined} /></label>
          <label className="block"><span className="label">Reden (optioneel)</span><input name="reden" className="input" placeholder="Bijvoorbeeld: op verzoek, geen betrokkene" /></label>
          <button className="btn btn-primary">Afmelden</button>
        </form>
        {afmeldingen.length > 0 && (
          <ul className="mt-5 divide-y divide-ink-100 border-t border-ink-100 text-sm">
            {afmeldingen.map((a) => (
              <li key={a.email} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span><span className="font-medium text-ink-900">{a.email}</span><span className="block text-xs text-ink-500">Afgemeld {dateTimeNl(a.op)} {a.door === "zelf" ? "door de ontvanger zelf" : "door platformbeheer"}{a.reden ? `, ${a.reden}` : ""}</span></span>
                <form action={weerAanmeldenAction.bind(null, a.email)}><button className="btn btn-ghost btn-sm">Weer aanmelden</button></form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Zoek op ontvanger, bijvoorbeeld een e-mailadres" />
        <button className="btn btn-secondary">Zoeken</button>
        {q && <a href="/beheer/emails" className="btn btn-ghost">Wissen</a>}
      </form>
      {q && <p className="mb-3 text-sm text-ink-600">{mails.length} bericht{mails.length === 1 ? "" : "en"} aan adressen met “{q}”.</p>}
      <Card className="divide-y divide-ink-100 p-0" data-tour="b-emails">
        {mails.map((m) => (
          <details key={m.id} className="group p-4">
            <summary className="flex cursor-pointer list-none flex-col gap-1 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-90" aria-hidden /><span className="min-w-0"><span className="block truncate font-semibold text-ink-900">{m.subject}</span><span className="block truncate text-xs text-ink-500">{m.to}, <span className="font-mono">{m.template}</span>{m.dossierId && <>, <a href={`/beheer/dossiers/${m.dossierId}`} className="underline decoration-brass-400 underline-offset-2">dossier</a></>}</span></span></span>
              <span className="flex shrink-0 items-center gap-2 pl-6 text-xs text-ink-500 sm:pl-0">{dateTimeNl(m.createdAt)}<Badge tone={m.status === "verzonden" ? "ok" : m.status === "mislukt" ? "bad" : m.status === "afgemeld" ? "warn" : "neutral"}>{m.status}</Badge></span>
            </summary>
            <iframe title={m.subject} srcDoc={m.html} className="mt-3 h-[28rem] w-full rounded-lg border border-ink-100 bg-white" sandbox="" />
          </details>
        ))}
      </Card>
    </>
  );
}
