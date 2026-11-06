import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowUpRight, BookOpen, Check, Compass, Download, FileText, Inbox, PlayCircle, RotateCcw, Sparkles } from "lucide-react";
import { SEEN_COOKIE, TOURS, parseSeen, tourByKey, tourForPath } from "@/lib/demo/tours";
import { DEMO } from "@/lib/demo/scenario";
import { mainDemoDossierId } from "@/lib/demo/main";
import { resetDemoAction } from "./actions";
import { Notice } from "@/components/ui";
import { BRAND, NOTARY_OFFICE } from "@/lib/config";
import { euro } from "@/lib/util/format";

export const metadata: Metadata = { title: "Demo: kies een tour", robots: { index: false } };

const RECOMMENDED = "notaris";

/**
 * Startpagina van demo.akte-loket.nl (de proxy stuurt "/" hierheen).
 * De demo is alleen via tours te gebruiken; na een tour kan de bezoeker het
 * uitgelegde deel zelf bekijken.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ reset?: string; van?: string }> }) {
  const sp = await searchParams;
  const jar = await cookies();
  const seen = new Set(parseSeen(jar.get(SEEN_COOKIE)?.value));
  const main = await mainDemoDossierId();
  const firstPage = (key: string) => tourByKey(key)!.steps[0].path.replace("{main}", main ?? "");
  const blocked = sp.van && sp.van.startsWith("/") ? sp.van : null;
  const match = blocked ? tourForPath(blocked) : undefined;

  return (
    <div className="pb-20">
      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-12 sm:py-16">
          {sp.reset && <Notice tone="ok" className="mb-8">De demo is teruggezet naar de beginsituatie.</Notice>}
          {blocked && (
            <Notice tone="info" className="mb-8" title="Kies eerst een tour">
              <p>De pagina <span className="font-mono text-[0.85em]">{blocked}</span> hoort bij een deel dat u nog niet in een tour heeft gezien. Na de tour kunt u daar zelf verder rondkijken.</p>
              {match && <a href={`/demo/start/${match.key}`} className="btn btn-dark btn-sm mt-3"><PlayCircle className="h-4 w-4" />Start de tour “{match.title}”</a>}
            </Notice>
          )}
          <p className="eyebrow">Demo-omgeving Akteloket</p>
          <h1 className="mt-3 max-w-3xl text-4xl text-ink-900 sm:text-5xl">
            Welkom{NOTARY_OFFICE.notaryShort ? `, ${NOTARY_OFFICE.notaryShort}` : ""}. Welke rondleiding wilt u zien?
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
            Elke tour logt u automatisch in met de juiste rol en wijst stap voor stap aan hoe het werkt, met één fictief voorbeelddossier. Na afloop kunt u de getoonde pagina’s zelf verder bekijken.
          </p>

          <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {TOURS.map((t) => {
              const done = seen.has(t.key);
              const rec = t.key === RECOMMENDED;
              return (
                <li key={t.key} className={`relative flex flex-col rounded-lg border bg-white p-6 transition hover:shadow-lift ${rec ? "border-brass-400 ring-1 ring-brass-300" : "border-ink-200"}`}>
                  {rec && <span className="chip absolute -top-3 left-6 bg-brass-500 text-ink-950">Aanbevolen voor de notaris</span>}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip bg-ink-50 text-ink-600">{t.minutes} minuten, {t.steps.length} stappen</span>
                    {done && <span className="chip bg-ok-50 text-ok-700"><Check className="h-3 w-3" />Bekeken</span>}
                  </div>
                  <h2 className="mt-4 text-xl text-ink-900">{t.title}</h2>
                  <p className="mt-1 text-sm font-medium text-ink-700">{t.audience}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{t.description}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <a href={`/demo/start/${t.key}`} className={`btn btn-sm ${done ? "btn-secondary" : rec ? "btn-brass" : "btn-primary"}`}>
                      <PlayCircle className="h-4 w-4" />{done ? "Opnieuw bekijken" : "Start tour"}
                    </a>
                    {done && <Link href={firstPage(t.key)} className="btn btn-ghost btn-sm"><Compass className="h-4 w-4" />Zelf rondkijken</Link>}
                  </div>
                </li>
              );
            })}
            <li className="flex flex-col justify-between rounded-lg border border-dashed border-ink-300 bg-paper p-6">
              <div>
                <h2 className="text-xl text-ink-900">Liever vrij rondkijken?</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">De demo is bedoeld voor rondleidingen. De website zelf bekijkt u op {BRAND.domain}.</p>
              </div>
              <a href={`https://${BRAND.domain}`} className="btn btn-secondary btn-sm mt-6 self-start">Naar {BRAND.domain} <ArrowUpRight className="h-4 w-4" /></a>
            </li>
          </ul>
        </div>
      </section>

      <section className="container-page mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-xl text-ink-900"><FileText className="h-5 w-5 text-brass-600" />Het voorbeelddossier</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            {DEMO.property.straat} {DEMO.property.huisnummer}, {DEMO.property.plaats}, koopprijs {euro(DEMO.koopprijs)}. Kopers Sanne de Vries (29) en Daan Bakker (36), verkopers Henk Jansen en Marijke Visser. Hypotheek bij Noorderlicht Hypotheken; de bestaande hypotheek van de verkopers loopt bij Westbank. Alles is fictief.
          </p>
          <a href="/api/demo/koopovereenkomst" className="mt-5 flex items-center gap-3 rounded-lg border border-ink-200 p-4 hover:border-ink-300">
            <Download className="h-5 w-5 shrink-0 text-brass-600" />
            <span><span className="block font-semibold text-ink-900">Voorbeeld-koopovereenkomst (PDF)</span><span className="block text-xs text-ink-500">Na de websitetour kunt u hem zelf uploaden in de aanvraag</span></span>
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link href="/demo/uitleg" className="card flex items-start gap-3 p-5 hover:shadow-lift"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-brass-600" /><span><span className="block font-semibold text-ink-900">Hoe alles werkt</span><span className="block text-sm text-ink-600">Processen, automatisering en koppelingen op één pagina.</span></span></Link>
          <Link href="/demo/validatie" className="card flex items-start gap-3 p-5 hover:shadow-lift"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brass-600" /><span><span className="block font-semibold text-ink-900">Beoordelingskader</span><span className="block text-sm text-ink-600">Geef per onderdeel aan: akkoord, aanpassen, schrappen of toevoegen.</span></span></Link>
          <Link href="/demo/mailbox" className="card flex items-start gap-3 p-5 hover:shadow-lift"><Inbox className="mt-0.5 h-5 w-5 shrink-0 text-brass-600" /><span><span className="block font-semibold text-ink-900">Demo-mailbox</span><span className="block text-sm text-ink-600">Alle e-mails die het systeem in de demo verstuurt.</span></span></Link>
          <form action={resetDemoAction} className="card flex items-start gap-3 p-5">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
            <span className="flex-1"><span className="block font-semibold text-ink-900">Demo terugzetten</span><span className="block text-sm text-ink-600">Alle dossiers terug naar de beginsituatie. Uw feedback blijft bewaard.</span></span>
            <button className="btn btn-secondary btn-sm shrink-0">Reset</button>
          </form>
        </div>
      </section>
    </div>
  );
}
