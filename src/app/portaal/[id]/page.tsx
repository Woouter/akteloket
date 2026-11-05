import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Cpu, MessageSquareWarning, PartyPopper, Phone, Scale, Sparkles } from "lucide-react";
import { requireParty } from "@/lib/auth/guards";
import { koopovereenkomstSteps, koperSteps, verkoperSteps } from "@/lib/workflow/steps";
import { StepsList } from "@/components/portal/steps-list";
import { Card, Notice, StateIcon } from "@/components/ui";
import { eventsFor } from "@/lib/domain/dossier";
import { BRAND, NOTARY_OFFICE } from "@/lib/config";
import { dateNl, daysBetween, todayIso, timeAgo } from "@/lib/util/format";
import { UploadButton } from "@/components/portal/upload";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const a = await requireParty(id);
  const { view, side } = a;
  const d = view.data;
  const isKo = d.service === "koopovereenkomst";
  const steps = isKo ? koopovereenkomstSteps(view) : side === "koper" ? koperSteps(view) : verkoperSteps(view);
  const next = steps.find((s) => s.actionable && (s.state === "attention" || s.state === "todo" || s.state === "in_progress") && s.owner === "klant");
  const requests = view.requests.filter((r) => r.side === side && r.status === "open");
  const events = (await eventsFor(id, 60)).filter((e) => e.visibleTo === "partijen" || e.visibleTo === side).slice(0, 8);
  const gepasseerd = !!d.gepasseerdOp;
  const dates = [
    d.transaction.leveringsdatum && { label: "Overdracht (passeren)", date: d.transaction.leveringsdatum, note: d.transaction.leveringsdatumStatus },
    side === "koper" && d.transaction.financieringsvoorbehoud?.datum && { label: "Financieringsvoorbehoud", date: d.transaction.financieringsvoorbehoud.datum },
    side === "koper" && d.transaction.waarborgsom?.uiterlijk && { label: "Waarborgsom uiterlijk", date: d.transaction.waarborgsom.uiterlijk, note: d.transaction.waarborgsom.ontvangen ? "ontvangen" : undefined },
    ...(side === "koper" ? (d.transaction.overigeVoorbehouden ?? []).filter((v) => v.datum).map((v) => ({ label: v.omschrijving, date: v.datum! })) : []),
  ].filter(Boolean) as { label: string; date: string; note?: string }[];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-6">
        {sp.welkom && <Notice tone="ok" icon={<PartyPopper className="h-5 w-5 text-ok-600" />} title="Je aanvraag is bevestigd!">Je dossier {view.dossier.reference} is aangemaakt. {d.koStatus === "ontbreekt" ? "Upload je getekende koopovereenkomst zodra je hem hebt; dan starten we direct." : "We zijn al begonnen: de kadastrale stukken worden opgehaald en de verkoper krijgt een eigen uitnodiging."} We hebben je ook een e-mail gestuurd.</Notice>}
        {sp.opgeslagen && <Notice tone="ok" icon={<CheckCircle2 className="h-5 w-5 text-ok-600" />} title="Opgeslagen">Bedankt! We hebben je gegevens verwerkt.</Notice>}
        {gepasseerd && <Notice tone="ok" icon={<PartyPopper className="h-5 w-5 text-ok-600" />} title={side === "koper" ? "Gefeliciteerd met je nieuwe woning!" : "De woning is overgedragen"}>De akte is gepasseerd op {dateNl(d.gepasseerdOp)} en ingeschreven in het Kadaster{d.ingeschrevenOp ? ` (${dateNl(d.ingeschrevenOp)})` : ""}.</Notice>}

        {d.koStatus === "ontbreekt" && side === "koper" && d.service !== "hypotheek" && !isKo && (
          <Card className="border-brand-200 bg-brand-50/50 p-6">
            <p className="text-sm font-semibold text-brand-700">Status: wachten op getekende koopovereenkomst</p>
            <p className="mt-1 text-lg font-bold text-ink-900">Upload je getekende koopovereenkomst om te starten</p>
            <p className="mt-1 text-sm text-ink-600">Zodra we hem hebben, lezen we de gegevens automatisch uit en openen we de rest van je stappen.</p>
            <div className="mt-4"><UploadButton dossierId={id} kind="koopovereenkomst" label="Koopovereenkomst uploaden" variant="primary" back={`/portaal/${id}/stap/gegevens`} /></div>
          </Card>
        )}

        {requests.map((r) => (
          <Card key={r.id} className="border-warn-100 bg-warn-50/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-warn-700"><MessageSquareWarning className="h-4 w-4" />Verzoek van de notaris</p>
            <p className="mt-1 font-bold text-ink-900">{r.title}</p>
            {r.description && <p className="mt-1 text-sm text-ink-700">{r.description}</p>}
            <div className="mt-3"><UploadButton dossierId={id} kind="aanvulling" extra={{ requestId: r.id, title: r.title }} label={r.kind === "document" ? "Document aanleveren" : "Antwoord als bijlage"} variant="dark" /></div>
          </Card>
        ))}

        {next && !gepasseerd && (
          <div className="relative overflow-hidden rounded-2xl bg-ink-900 p-6 text-white" data-tour="portal-next">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass-400/70 to-transparent" />
            <p className="eyebrow flex items-center gap-2 !text-brass-300"><Sparkles className="h-3.5 w-3.5" />Jouw volgende stap</p>
            <p className="mt-2 font-serif text-2xl font-semibold">{next.nr}. {next.title}</p>
            <p className="mt-1 text-sm text-ink-300">{next.description}</p>
            <Link href={`/portaal/${id}/stap/${next.key}`} className="btn btn-brass mt-5">Ga verder <ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}
        {!next && !gepasseerd && (d.koStatus !== "ontbreekt" || isKo) && (
          <Notice tone="info" icon={<CheckCircle2 className="h-5 w-5 text-brand-600" />} title="Je bent helemaal bij">Er staat op dit moment niets voor je klaar. Wij en de notaris ronden de rest af — je hoort het zodra er iets van je nodig is.</Notice>
        )}

        <div>
          <h2 className="mb-3 text-lg font-bold text-ink-900">{isKo ? "Jouw koopovereenkomst" : side === "koper" ? "Jouw 12 stappen" : "Jouw stappen als verkoper"}</h2>
          <StepsList steps={steps} base={`/portaal/${id}`} side={side} />
        </div>
      </div>

      <aside className="space-y-5">
        <Card className="p-5" data-tour="portal-platform">
          <p className="flex items-center gap-2 font-semibold text-ink-900"><Cpu className="h-4 w-4 text-platform-600" />Wat wij voor je doen</p>
          <ul className="mt-3 space-y-3">
            {steps.filter((s) => s.state !== "na").slice(0, 12).map((s) => (
              <li key={s.key} className="flex gap-2.5 text-sm"><StateIcon state={s.state === "done" ? "done" : s.owner === "platform" ? s.state : "waiting"} size="sm" /><span className="text-ink-600">{s.platform}</span></li>
            )).slice(side === "koper" ? 0 : 0, 6)}
          </ul>
        </Card>
        {dates.length > 0 && (
          <Card className="p-5">
            <p className="flex items-center gap-2 font-semibold text-ink-900"><CalendarClock className="h-4 w-4 text-brand-600" />Belangrijke data</p>
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {dates.map((x) => { const dd = daysBetween(todayIso(), x.date); return <li key={x.label} className="flex items-start justify-between gap-3 py-2.5"><span className="text-ink-600">{x.label}{x.note && <span className="block text-xs text-ink-400">{x.note}</span>}</span><span className="text-right font-semibold text-ink-900">{dateNl(x.date, { short: true })}<span className="block text-xs font-normal text-ink-400">{dd > 0 ? `over ${dd} dagen` : dd === 0 ? "vandaag" : "verstreken"}</span></span></li>; })}
            </ul>
          </Card>
        )}
        <Card className="p-5">
          <p className="flex items-center gap-2 font-semibold text-ink-900"><Scale className="h-4 w-4 text-notaris-600" />Je notaris</p>
          <p className="mt-2 text-sm text-ink-700">{NOTARY_OFFICE.notaryShort}<br />{NOTARY_OFFICE.officeName}, {NOTARY_OFFICE.city}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-600"><Phone className="h-4 w-4" />Vragen? {BRAND.phone}</p>
          <p className="mt-1 text-xs text-ink-400">Vermeld je dossiernummer {view.dossier.reference}</p>
        </Card>
        {events.length > 0 && (
          <Card className="p-5">
            <p className="font-semibold text-ink-900">Laatste activiteit</p>
            <ul className="mt-3 space-y-3">{events.map((e) => <li key={e.id} className="text-sm"><p className="text-ink-700">{e.message}</p><p className="text-xs text-ink-400">{timeAgo(e.createdAt)}</p></li>)}</ul>
            <Link href={`/portaal/${id}/activiteit`} className="mt-3 inline-block text-sm font-semibold text-brand-700">Alles bekijken →</Link>
          </Card>
        )}
      </aside>
    </div>
  );
}
