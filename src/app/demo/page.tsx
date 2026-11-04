import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Download, FileText, FlaskConical, Inbox, Landmark, PlayCircle, RotateCcw, ScanLine, Sparkles, Users } from "lucide-react";
import { TOURS } from "@/lib/demo/tours";
import { PERSONAS } from "@/lib/demo/personas";
import { DEMO } from "@/lib/demo/scenario";
import { mainDemoDossierId } from "@/lib/demo/main";
import { resetDemoAction } from "./actions";
import { Card, Notice } from "@/components/ui";
import { NOTARY_OFFICE } from "@/lib/config";
import { euro } from "@/lib/util/format";

export const metadata: Metadata = { title: "Demo-omgeving", robots: { index: false } };

const tone: Record<string, string> = { website: "bg-brand-50 text-brand-700", koper: "bg-koper-50 text-koper-600", verkoper: "bg-verkoper-50 text-verkoper-700", notaris: "bg-notaris-50 text-notaris-700", platform: "bg-platform-50 text-platform-600" };

export default async function Page({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const sp = await searchParams;
  const main = await mainDemoDossierId();
  return (
    <div className="container-page py-12">
      {sp.reset && <Notice tone="ok" className="mb-6">De demo is teruggezet naar de beginsituatie.</Notice>}
      <section className="relative overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-12 text-white sm:px-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />
        <p className="flex items-center gap-2 text-sm font-semibold text-notaris-100"><FlaskConical className="h-4 w-4" />Demo-omgeving · demo.akte-loket.nl</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Welkom{NOTARY_OFFICE.notaryShort ? `, ${NOTARY_OFFICE.notaryShort}` : ""}. Zo werkt Akteloket van A tot Z.</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-300">Dit is de volledige werkende omgeving — website, klantportaal, verkopersportaal, uw notariswerkplek en ons platformbeheer — gevuld met één fictief voorbeelddossier. Start een tour, of klik zelf rond in elke rol.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/demo/start/notaris" prefetch={false} className="btn btn-primary btn-lg"><PlayCircle className="h-5 w-5" />Start de tour voor de notaris</Link>
          <Link href="/demo/uitleg" className="btn btn-lg bg-white/10 text-white hover:bg-white/15"><BookOpen className="h-5 w-5" />Hoe alles werkt</Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-ink-900">Uitlegtours</h2>
        <p className="mt-1 text-ink-600">Elke tour logt u automatisch in met de juiste rol en wijst stap voor stap aan hoe het werkt.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {TOURS.map((t) => (
            <Card key={t.key} className="flex flex-col p-6">
              <span className={`chip self-start ${tone[t.key]}`}>{t.minutes} min · {t.steps.length} stappen</span>
              <p className="mt-4 text-lg font-bold text-ink-900">{t.title}</p>
              <p className="mt-1 flex-1 text-sm text-ink-600">{t.description}</p>
              <Link href={`/demo/start/${t.key}`} prefetch={false} className="btn btn-dark btn-sm mt-5">Start tour <ArrowRight className="h-4 w-4" /></Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900"><FileText className="h-5 w-5 text-brand-600" />Het voorbeelddossier</h2>
          <p className="mt-1 text-sm text-ink-600">{DEMO.property.straat} {DEMO.property.huisnummer}, {DEMO.property.plaats} — koopprijs {euro(DEMO.koopprijs)}. Kopers Sanne de Vries (29) en Daan Bakker (36), verkopers Henk Jansen en Marijke Visser. Hypotheek bij Noorderlicht Hypotheken; bestaande hypotheek verkopers bij Westbank. Alles fictief.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href="/api/demo/koopovereenkomst" className="flex items-center gap-3 rounded-xl border border-ink-100 p-4 hover:border-ink-200"><Download className="h-5 w-5 text-brand-600" /><span><span className="block font-semibold text-ink-900">Koopovereenkomst (PDF)</span><span className="block text-xs text-ink-500">Download en upload hem zelf in de aanvraag</span></span></a>
            <Link href={`/demo/als/notaris?next=${encodeURIComponent(`/notaris/dossiers/${main}/akte/levering`)}`} className="flex items-center gap-3 rounded-xl border border-ink-100 p-4 hover:border-ink-200"><FileText className="h-5 w-5 text-brand-600" /><span><span className="block font-semibold text-ink-900">Concept-leveringsakte</span><span className="block text-xs text-ink-500">Met bronnen en controlepunten</span></span></Link>
            <Link href={`/demo/als/notaris?next=${encodeURIComponent(`/notaris/dossiers/${main}/akte/hypotheek`)}`} className="flex items-center gap-3 rounded-xl border border-ink-100 p-4 hover:border-ink-200"><Landmark className="h-5 w-5 text-brand-600" /><span><span className="block font-semibold text-ink-900">Concept-hypotheekakte</span><span className="block text-xs text-ink-500">Uit de (fictieve) bankinstructie</span></span></Link>
            <Link href={`/demo/als/notaris?next=${encodeURIComponent(`/notaris/dossiers/${main}/overdracht`)}`} className="flex items-center gap-3 rounded-xl border border-ink-100 p-4 hover:border-ink-200"><ClipboardList className="h-5 w-5 text-brand-600" /><span><span className="block font-semibold text-ink-900">Dossieroverdracht</span><span className="block text-xs text-ink-500">Alle onderdelen + ZIP-download</span></span></Link>
          </div>
          <div className="mt-5 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
            <p className="flex items-center gap-2 font-semibold text-ink-900"><ScanLine className="h-4 w-4" />Zelf een aanvraag doen?</p>
            <p className="mt-1">Ga naar <Link href="/demo/als/uit?next=/aanvraag" className="font-semibold text-brand-700 underline">Start je aanvraag</Link> en kies ‘Gebruik voorbeeld’. U doorloopt dan de echte klantflow; daarna kunt u in het portaal met de knop <strong>Demo-acties</strong> (linksonder) gebeurtenissen simuleren, zoals ‘bankinstructie ontvangen’.</p>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900"><Users className="h-5 w-5 text-brand-600" />Bekijk als…</h2>
          <ul className="mt-4 space-y-2">
            {PERSONAS.map((p) => (
              <li key={p.key}><Link href={`/demo/als/${p.key}`} className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 p-3 hover:border-ink-200"><span><span className="block font-semibold text-ink-900">{p.name} <span className="font-normal text-ink-500">· {p.label}</span></span><span className="block text-xs text-ink-500">{p.description}</span></span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-300" /></Link></li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-3">
        <Link href="/demo/validatie" className="card group p-6 hover:shadow-lift"><Sparkles className="h-6 w-6 text-notaris-600" /><p className="mt-4 text-lg font-bold text-ink-900">Beoordelingskader</p><p className="mt-1 text-sm text-ink-600">Geef per onderdeel aan: akkoord, aanpassen, schrappen of toevoegen. Wij verwerken het direct.</p></Link>
        <Link href="/demo/mailbox" className="card group p-6 hover:shadow-lift"><Inbox className="h-6 w-6 text-brand-600" /><p className="mt-4 text-lg font-bold text-ink-900">Demo-mailbox</p><p className="mt-1 text-sm text-ink-600">Alle e-mails die het systeem verstuurt (uitnodigingen, herinneringen, datumcheck, meldingen aan u).</p></Link>
        <form action={resetDemoAction} className="card flex flex-col p-6"><RotateCcw className="h-6 w-6 text-ink-500" /><p className="mt-4 text-lg font-bold text-ink-900">Demo terugzetten</p><p className="mt-1 flex-1 text-sm text-ink-600">Zet alle dossiers terug naar de beginsituatie. Uw feedback uit het beoordelingskader blijft bewaard.</p><button className="btn btn-secondary btn-sm mt-4 self-start">Reset demo</button></form>
      </section>
    </div>
  );
}
