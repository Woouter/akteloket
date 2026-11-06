import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardCheck, Hourglass, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { summaries } from "@/lib/domain/overview";
import { PageTitle } from "@/components/staff/shell";
import { PipelineTable } from "@/components/staff/pipeline";
import { Card, EmptyState } from "@/components/ui";
import { CardTitle } from "@/components/staff/card-title";
import { humanize } from "@/components/staff/labels";
import { dateNl, hourNl, propertyLine } from "@/lib/util/format";

const REVIEW_MAX = 12;
const SIGNALS_MAX = 6;

export default async function Page() {
  const user = await requireUser(["notaris"]);
  const all = await summaries();
  // Het losse product "koopovereenkomst opstellen" kent geen akte of passeren: niet in de werkvoorraad.
  const open = all.filter((s) => !["afgewikkeld", "geannuleerd"].includes(s.view.dossier.status) && s.view.data.service !== "koopovereenkomst");
  const review = open.flatMap((s) => s.toReview.map((c) => ({ s, c })));
  const soon = open.filter((s) => s.daysToPassing !== undefined && s.daysToPassing >= 0 && s.daysToPassing <= 14);
  const waiting = open.filter((s) => s.view.dossier.status === "intake" || s.view.dossier.status === "wacht_op_ko");
  const signals = open.flatMap((s) => s.signals.map((x) => ({ s, x })));
  const hour = hourNl();
  const tiles = [
    { icon: ClipboardCheck, label: "Klaar voor uw controle", value: review.length, tone: "text-brand-700 bg-brand-50" },
    { icon: CalendarClock, label: "Passeren ≤ 14 dagen", value: soon.length, tone: "text-notaris-700 bg-notaris-50" },
    { icon: Hourglass, label: "Wacht op klanten", value: waiting.length, tone: "text-platform-600 bg-platform-50" },
    { icon: ShieldAlert, label: "Open signaleringen", value: signals.length, tone: "text-warn-700 bg-warn-50" },
  ];
  return (
    <>
      <PageTitle title={`${hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond"}, ${user.name.split(" ")[0]}`} sub={`${dateNl(new Date(), { weekday: true })}, ${open.length} lopende dossiers`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => <Card key={t.label} className="flex items-center gap-4 p-5"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.tone}`}><t.icon className="h-5 w-5" /></span><span><span className="block font-serif text-3xl font-semibold text-ink-900 tabular">{t.value}</span><span className="block text-sm text-ink-500">{t.label}</span></span></Card>)}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-0" data-tour="n-actions">
          <div className="border-b border-ink-100 p-5"><CardTitle>Vraagt uw aandacht</CardTitle><p className="mt-0.5 text-sm text-ink-500">Alleen onderdelen waarvoor alle informatie is aangeleverd.</p></div>
          {review.length === 0 ? <div className="p-5"><EmptyState title="Niets te beoordelen">Zodra een onderdeel compleet is, verschijnt het hier.</EmptyState></div> : (
            <ul className="divide-y divide-ink-100">
              {review.slice(0, REVIEW_MAX).map(({ s, c }) => (
                <li key={s.view.dossier.id + c.key}><Link href={`/notaris/dossiers/${s.view.dossier.id}#${c.key}`} className="flex items-center justify-between gap-4 p-4 hover:bg-ink-50/60">
                  <span className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-mono text-xs font-bold text-white">{c.nr}</span><span className="min-w-0"><span className="block truncate font-semibold text-ink-900">{c.title}</span><span className="block truncate text-xs text-ink-500">{propertyLine(s.view.data.property)}, {humanize(c.readyLabel)}{c.flags.length ? `, ${c.flags.length} signalering${c.flags.length > 1 ? "en" : ""}` : ""}</span></span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" />
                </Link></li>
              ))}
            </ul>
          )}
          {review.length > REVIEW_MAX && <div className="border-t border-ink-100 px-5 py-3 text-sm"><Link href="/notaris/dossiers" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-900">Alle dossiers bekijken (nog {review.length - REVIEW_MAX} onderdelen)<ArrowRight className="h-4 w-4" /></Link></div>}
        </Card>
        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <CardTitle>Binnenkort passeren</CardTitle>
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {soon.length === 0 && <li className="py-2 text-ink-500">Geen passeringen in de komende 14 dagen.</li>}
              {soon.map((s) => <li key={s.view.dossier.id} className="flex items-center justify-between gap-3 py-2.5"><Link href={`/notaris/dossiers/${s.view.dossier.id}`} className="truncate font-medium text-ink-800 hover:text-brand-700">{propertyLine(s.view.data.property)}</Link><span className="shrink-0 text-ink-500">{dateNl(s.view.data.transaction.leveringsdatum, { short: true })}</span></li>)}
            </ul>
          </Card>
          <Card className="p-5">
            <CardTitle>Signaleringen</CardTitle>
            <ul className="mt-3 space-y-3 text-sm">
              {signals.length === 0 && <li className="text-ink-500">Geen open signaleringen.</li>}
              {signals.slice(0, SIGNALS_MAX).map(({ s, x }, i) => <li key={i} className="rounded-lg bg-warn-50 p-3"><p className="text-ink-800">{x.tekst}</p><Link href={`/notaris/dossiers/${s.view.dossier.id}`} className="text-xs font-semibold text-warn-700">{propertyLine(s.view.data.property)} →</Link></li>)}
            </ul>
            {signals.length > SIGNALS_MAX && <p className="mt-3 text-sm"><Link href="/notaris/dossiers" className="font-semibold text-brand-700 hover:text-brand-900">Alle dossiers bekijken (nog {signals.length - SIGNALS_MAX} signaleringen) →</Link></p>}
          </Card>
        </div>
      </div>
      <div className="mt-8" data-tour="n-pipeline">
        <h2 className="mb-3 font-serif text-lg font-semibold text-ink-900">Alle lopende dossiers</h2>
        <PipelineTable rows={open} base="notaris" />
        <p className="mt-3 flex flex-wrap gap-4 text-xs text-ink-500"><span><span className="mr-1 inline-block h-3 w-3 rounded bg-brand-600 align-middle" />klaar voor controle</span><span><span className="mr-1 inline-block h-3 w-3 rounded bg-ok-600 align-middle" />akkoord</span><span><span className="mr-1 inline-block h-3 w-3 rounded bg-warn-100 ring-1 ring-warn-600/30 align-middle" />aanvulling gevraagd</span><span><span className="mr-1 inline-block h-3 w-3 rounded bg-ink-100 align-middle" />wacht op informatie</span></p>
      </div>
    </>
  );
}
