import type { Metadata } from "next";
import { Glyph } from "@/components/icons/glyphs";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Cpu, MessageSquareWarning, Phone, Scale, Send } from "lucide-react";
import { requireParty } from "@/lib/auth/guards";
import { koopovereenkomstSteps, koperSteps, stateFor, verkoperSteps } from "@/lib/workflow/steps";
import { StepsList } from "@/components/portal/steps-list";
import { Card, Notice, StateIcon } from "@/components/ui";
import { eventsFor } from "@/lib/domain/dossier";
import { BRAND, NOTARY_OFFICE } from "@/lib/config";
import { dateNl, daysBetween, todayIso, timeAgo } from "@/lib/util/format";
import { UploadButton } from "@/components/portal/upload";

export const metadata: Metadata = { title: "Mijn dossier", robots: { index: false } };

/** Bevestigingen na het opslaan van een stap (?opgeslagen=<sleutel>). */
const SAVED: Record<string, [string, string]> = {
  "1": ["Opgeslagen", "Bedankt! We hebben je gegevens verwerkt."],
  gegevens: ["Gegevens bevestigd", "Bedankt! We hebben je persoonsgegevens vastgelegd. Wijzigingen ten opzichte van de koopovereenkomst ziet de notaris terug."],
  woning: ["Woning en financiering opgeslagen", "We verwachten nu de hypotheekinstructie van je geldverstrekker (als je een hypotheek hebt)."],
  iban: ["Rekeningnummer vastgelegd", "Het IBAN is gecontroleerd en vastgelegd voor de nota van afrekening."],
  wwft: ["Wwft-informatie aangeleverd", "De notaris beoordeelt de informatie en laat het weten als er nog iets nodig is."],
  id: ["Identificatie gelukt", "Je bent geïdentificeerd. De gecontroleerde naam en geboortedatum komen overeen met de koopovereenkomst."],
  datum: ["Overdrachtsdatum doorgegeven", "Dank je wel. De notaris is op de hoogte."],
  zekerheden: ["Zekerheden bevestigd", "De notaris vraagt de aflosnota op bij je geldverstrekker."],
  nota: ["Nota bekeken", "We hebben vastgelegd dat je de nota van afrekening hebt gezien."],
  verzoek: ["Verzoek beantwoord", "De notaris heeft je antwoord ontvangen."] };

const DATUM_STATUS: Record<string, string> = { voorlopig: "voorlopig", bevestigd: "bevestigd", gewijzigd: "gewijzigd", nog_te_bepalen: "nog te bepalen" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const a = await requireParty(id, `/portaal/${id}`);
  const { view, side } = a;
  const d = view.data;
  const isKo = d.service === "koopovereenkomst";
  const steps = isKo ? koopovereenkomstSteps(view) : side === "koper" ? koperSteps(view) : verkoperSteps(view);
  // Volgende stap voor déze persoon: een stap die een ander nog moet doen (bijv. de volmacht van de medekoper) telt niet.
  const next = steps.find((s) => { const st = stateFor(s, a.me.id); return s.actionable && s.owner === "klant" && (st === "attention" || st === "todo" || st === "in_progress"); });
  const requests = view.requests.filter((r) => r.side === side && r.status === "open");
  const events = (await eventsFor(id, 60)).filter((e) => e.visibleTo === "partijen" || e.visibleTo === side).slice(0, 8);
  const gepasseerd = !!d.gepasseerdOp;
  const koOntbreekt = d.koStatus === "ontbreekt" && side === "koper" && d.service !== "hypotheek" && !isKo;
  const saved = sp.opgeslagen ? SAVED[sp.opgeslagen] ?? SAVED["1"] : undefined;
  const today = todayIso();
  const wb = d.transaction.waarborgsom;
  const dates = [
    d.transaction.leveringsdatum && { label: "Overdracht (passeren)", date: d.transaction.leveringsdatum, note: DATUM_STATUS[d.transaction.leveringsdatumStatus ?? ""], kind: "levering" as const },
    side === "koper" && d.transaction.financieringsvoorbehoud?.datum && { label: "Financieringsvoorbehoud", date: d.transaction.financieringsvoorbehoud.datum, kind: "voorbehoud" as const },
    side === "koper" && wb?.uiterlijk && { label: wb.type === "bankgarantie" ? "Bankgarantie uiterlijk" : "Waarborgsom uiterlijk", date: wb.uiterlijk, note: wb.ontvangen ? "ontvangen door de notaris" : undefined, kind: "waarborg" as const, done: !!wb.ontvangen },
    ...(side === "koper" ? (d.transaction.overigeVoorbehouden ?? []).filter((v) => v.datum).map((v) => ({ label: v.omschrijving, date: v.datum!, kind: "voorbehoud" as const })) : []),
  ].filter(Boolean) as { label: string; date: string; note?: string; kind: "levering" | "voorbehoud" | "waarborg"; done?: boolean }[];
  const waarborgOpen = dates.some((x) => x.kind === "waarborg" && !x.done && daysBetween(today, x.date) < 0);
  // "Wat wij voor je doen": eerst wat nog loopt, daarna wat al klaar is.
  const platformItems = [...steps.filter((s) => s.state !== "na" && s.state !== "done"), ...steps.filter((s) => s.state === "done")].slice(0, 6);
  const welkomTekst = isKo
    ? "We stellen nu het concept van jullie koopovereenkomst op. Een jurist controleert het voordat jullie digitaal tekenen."
    : d.koStatus === "ontbreekt"
      ? "Upload je getekende koopovereenkomst zodra je hem hebt; dan starten we direct."
      : d.kadaster.status === "opgehaald"
        ? "We zijn al begonnen: de kadastrale stukken zijn opgehaald en de verkoper krijgt een eigen uitnodiging. Controleer nu je gegevens."
        : "We zijn al begonnen: we halen de kadastrale stukken op en de verkoper krijgt een eigen uitnodiging.";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-6">
        {sp.welkom && <Notice tone="ok" icon={<Glyph name="route" size={24} />} title={isKo ? "Je aanvraag is ontvangen!" : "Je aanvraag is bevestigd!"}>Je dossier {view.dossier.reference} is aangemaakt. {welkomTekst} We hebben je ook een e-mail gestuurd.</Notice>}
        {saved && !sp.welkom && <Notice tone="ok" icon={<CheckCircle2 className="h-5 w-5 text-ok-600" />} title={saved[0]}>{saved[1]}</Notice>}
        {sp.uitgenodigd && <Notice tone="ok" icon={<Send className="h-5 w-5 text-ok-600" />} title="Uitnodiging verstuurd">De uitnodiging is per e-mail verstuurd. Je ziet in de stappen wanneer de persoonlijke stappen zijn afgerond.</Notice>}
        {sp.fout && <Notice tone="bad" icon={<AlertTriangle className="h-5 w-5 text-bad-700" />} title="Dat lukte niet">{sp.fout}</Notice>}
        {gepasseerd && <Notice tone="ok" icon={<Glyph name="key" size={24} />} title={side === "koper" ? "Gefeliciteerd met je nieuwe woning!" : "De woning is overgedragen"}>De akte is gepasseerd op {dateNl(d.gepasseerdOp)} en ingeschreven in het Kadaster{d.ingeschrevenOp ? ` (${dateNl(d.ingeschrevenOp)})` : ""}.</Notice>}

        {requests.map((r) => (
          <Card key={r.id} className="border-warn-100 bg-warn-50/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-warn-700"><MessageSquareWarning className="h-4 w-4" />Verzoek van de notaris</p>
            <p className="mt-1 font-semibold text-ink-900">{r.title}</p>
            {r.description && <p className="mt-1 text-sm text-ink-700">{r.description}</p>}
            <div className="mt-3"><UploadButton dossierId={id} kind="aanvulling" extra={{ requestId: r.id, title: r.title }} label={r.kind === "document" ? "Document aanleveren" : "Antwoord als bijlage"} variant="dark" /></div>
          </Card>
        ))}

        {next && !gepasseerd && (
          <div className="relative overflow-hidden rounded-2xl bg-ink-900 p-6 text-white" data-tour="portal-next">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass-400/70 to-transparent" />
            <p className="eyebrow flex items-center gap-2 !text-brass-300">{koOntbreekt && next.key === "koopovereenkomst" ? "Status: wachten op je getekende koopovereenkomst" : "Jouw volgende stap"}</p>
            <p className="mt-2 font-serif text-2xl font-semibold">{next.nr}. {next.title}</p>
            <p className="mt-1 text-sm text-ink-300">{koOntbreekt && next.key === "koopovereenkomst" ? "Zodra we hem hebben, lezen we de gegevens automatisch uit en openen we de rest van je stappen." : next.description}</p>
            {koOntbreekt && next.key === "koopovereenkomst"
              ? <div className="mt-5"><UploadButton dossierId={id} kind="koopovereenkomst" label="Koopovereenkomst uploaden" variant="brass" back={`/portaal/${id}/stap/gegevens`} /></div>
              : <Link href={`/portaal/${id}/stap/${next.key}`} className="btn btn-brass mt-5">Ga verder <ArrowRight className="h-4 w-4" /></Link>}
          </div>
        )}
        {!next && !gepasseerd && (!koOntbreekt || isKo) && (
          <Notice tone="info" icon={<CheckCircle2 className="h-5 w-5 text-brand-600" />} title="Je bent helemaal bij">Er staat op dit moment niets voor je klaar. Wij en de notaris ronden de rest af. Je hoort het zodra we iets van je nodig hebben.</Notice>
        )}

        <div>
          <h2 className="mb-3 text-lg text-ink-900">{isKo ? "Jouw koopovereenkomst" : side === "koper" ? "Jouw 12 stappen" : "Jouw stappen als verkoper"}</h2>
          <StepsList steps={steps} base={`/portaal/${id}`} side={side} />
        </div>
      </div>

      <aside className="min-w-0 space-y-5">
        <Card className="p-5" data-tour="portal-platform">
          <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-ink-900"><Cpu className="h-4 w-4 text-platform-600" />Wat wij voor je doen</h2>
          <ul className="mt-3 space-y-3">
            {platformItems.map((s) => (
              <li key={s.key} className="flex gap-2.5 text-sm"><StateIcon state={s.state === "done" ? "done" : s.owner === "platform" ? s.state : s.state === "locked" ? "locked" : "waiting"} size="sm" /><span className="text-ink-600">{s.platform}</span></li>
            ))}
          </ul>
        </Card>
        {dates.length > 0 && (
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-ink-900"><CalendarClock className="h-4 w-4 text-brand-600" />Belangrijke data</h2>
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {dates.map((x) => {
                const dd = daysBetween(today, x.date);
                const status = x.done ? "voldaan" : dd > 0 ? `over ${dd} ${dd === 1 ? "dag" : "dagen"}` : dd === 0 ? "vandaag" : x.kind === "waarborg" ? "nog niet ontvangen" : x.kind === "voorbehoud" ? "termijn verstreken" : "verstreken";
                const warn = !x.done && dd < 0 && x.kind === "waarborg";
                return (
                  <li key={x.label} className="flex items-start justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-ink-600">{x.label}{x.note && <span className="block text-xs text-ink-400">{x.note}</span>}</span>
                    <span className="shrink-0 text-right font-semibold text-ink-900">{dateNl(x.date, { short: true })}<span className={warn ? "block text-xs font-medium text-warn-700" : "block text-xs font-normal text-ink-400"}>{status}</span></span>
                  </li>
                );
              })}
            </ul>
            {waarborgOpen && <p className="mt-3 flex gap-2 rounded-lg bg-warn-50 p-3 text-xs text-warn-700"><AlertTriangle className="h-4 w-4 shrink-0" />De uiterste datum voor de waarborgsom is voorbij en de notaris heeft nog geen betaling geregistreerd. Al betaald? Dan hoef je niets te doen; anders neem je contact met ons op.</p>}
          </Card>
        )}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-ink-900"><Scale className="h-4 w-4 text-notaris-600" />Je notaris</h2>
          <p className="mt-2 text-sm text-ink-700">{NOTARY_OFFICE.notaryShort}<br />{NOTARY_OFFICE.officeName}, {NOTARY_OFFICE.city}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-600"><Phone className="h-4 w-4" />Vragen? <a href={BRAND.phoneHref} className="font-medium text-ink-900 hover:underline">{BRAND.phone}</a></p>
          <p className="mt-1 text-xs text-ink-400">Vermeld je dossiernummer {view.dossier.reference}</p>
        </Card>
        {events.length > 0 && (
          <Card className="p-5">
            <h2 className="font-sans text-base font-semibold text-ink-900">Laatste activiteit</h2>
            <ul className="mt-3 space-y-3">{events.map((e) => <li key={e.id} className="text-sm"><p className="text-ink-700">{e.message}</p><p className="text-xs text-ink-400">{timeAgo(e.createdAt)}</p></li>)}</ul>
            <Link href={`/portaal/${id}/activiteit`} className="mt-3 inline-block text-sm font-semibold text-brand-700">Alles bekijken →</Link>
          </Card>
        )}
      </aside>
    </div>
  );
}
