import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, Download, Eye, FileText, Gavel, Info, MessageSquarePlus, RotateCcw, Send, ShieldAlert, Upload } from "lucide-react";
import type { DossierView } from "@/lib/domain/dossier";
import type { NotaryCheck } from "@/lib/workflow/steps";
import { Badge, StateIcon } from "@/components/ui";
import { decideCheck, requestAanvulling, sendAflosnotaVerzoek, markPayoffChecked, publishNotas, passeren, afwikkelen } from "@/app/notaris/actions";
import { cn, dateNl, dateTimeNl, euro, formatIban } from "@/lib/util/format";

const CHECK_NAMES: Record<string, string> = { wwft_id: "N1 Wwft en identificatie", volmachten: "N2 Volmachten", leveringsakte: "N3 Concept-leveringsakte", hypotheekakte: "N4 Concept-hypotheekakte", aflosnotas: "N5 Aflosnota's", nota: "N6 Nota's van afrekening" };
import { notaKoper, notaVerkoper } from "@/lib/domain/calc";
import { NotaTable } from "@/components/portal/steps/nota-table";
import type { WwftRule } from "@/lib/domain/settings";
import { FileField } from "./file-field";
import { BANK_STATUS, ID_METHODE, ID_STATUS, NOTA_STATUS, WWFT_BESCHIKBAAR, WWFT_DETAIL, WWFT_EIGENAAR, WWFT_REKENING, cap, humanize, label } from "./labels";

const statusChip = (c: NotaryCheck) =>
  !c.applicable ? <Badge>n.v.t.</Badge> : c.status === "akkoord" ? <Badge tone="ok"><Check className="h-3 w-3" />Akkoord</Badge> : c.status === "aanvulling_gevraagd" ? <Badge tone="warn">Aanvulling gevraagd</Badge> : c.ready ? <Badge tone="brand">Klaar voor controle</Badge> : <Badge>Wacht op informatie</Badge>;

export function CheckCard({ view, c, matrix, isNotary }: { view: DossierView; c: NotaryCheck; matrix: WwftRule[]; isNotary: boolean }) {
  const check = view.checks.find((x) => x.key === c.key);
  const id = view.dossier.id;
  return (
    <section id={c.key} className={cn("card scroll-mt-24 p-0", !c.applicable && "opacity-60")}>
      <header className="flex flex-col gap-3 border-b border-ink-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className={cn("flex h-10 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold", c.status === "akkoord" ? "bg-ok-600 text-white" : c.ready ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>{c.nr}</span>
          <div className="min-w-0"><h3 className="font-serif text-[1.0625rem] font-semibold leading-snug text-ink-900">{c.title}</h3><p className="mt-0.5 text-sm text-ink-500">{c.description}</p><p className="mt-1 text-xs font-medium text-ink-600">{humanize(c.readyLabel)}</p></div>
        </div>
        <div className="shrink-0">{statusChip(c)}</div>
      </header>
      {c.applicable && (
        <div className="space-y-4 p-5">
          {c.flags.length > 0 && (
            <ul className="space-y-2">
              {c.flags.map((f, i) => <li key={i} className={cn("flex gap-2 rounded-lg p-2.5 text-sm", f.ernst === "kritiek" ? "bg-bad-50 text-bad-700" : f.ernst === "let_op" ? "bg-warn-50 text-ink-800" : "bg-ink-50 text-ink-700")}>{f.ernst === "kritiek" ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> : f.ernst === "let_op" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />}{f.tekst}</li>)}
            </ul>
          )}
          <CheckBody view={view} c={c} matrix={matrix} isNotary={isNotary} />
          {check?.comment && <p className="rounded-lg bg-ink-50 p-3 text-xs text-ink-600"><strong>{check.decidedBy}</strong> · {dateTimeNl(check.decidedAt)}: {check.comment}</p>}
          {isNotary && c.key !== "passeren" && !view.data.afgewikkeldOp && (
            <div className="flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {c.status === "akkoord" ? (
                <form action={decideCheck.bind(null, id, c.key, "open")}><button className="btn btn-ghost btn-sm -ml-2"><RotateCcw className="h-4 w-4" />Heropenen</button></form>
              ) : (
                <form action={decideCheck.bind(null, id, c.key, "akkoord")} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input name="comment" className="input py-[0.4375rem] text-sm sm:max-w-sm" placeholder="Opmerking (optioneel)" aria-label={`Opmerking bij ${c.nr}`} />
                  <button className="btn btn-ok btn-sm" disabled={!c.ready} title={c.ready ? undefined : "Nog niet alle informatie is aangeleverd"}><CheckCircle2 className="h-4 w-4" />Akkoord</button>
                </form>
              )}
              <RequestForm dossierId={id} checkKey={c.key} hasVerkoper={view.verkopers.length > 0} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RequestForm({ dossierId, checkKey, hasVerkoper }: { dossierId: string; checkKey: string; hasVerkoper: boolean }) {
  return (
    // Uitklappaneel dat over de inhoud valt (geen verspringende rij); sluit bij klik ernaast (data-menu).
    <details className="group relative shrink-0" data-menu>
      <summary className="btn btn-secondary btn-sm list-none [&::-webkit-details-marker]:hidden"><MessageSquarePlus className="h-4 w-4" />Vraag aanvulling</summary>
      <form action={requestAanvulling.bind(null, dossierId)} className="mt-2 grid gap-2 rounded-lg border border-ink-100 bg-white p-3 shadow-lift sm:absolute sm:right-0 sm:z-20 sm:w-96">
        <input type="hidden" name="checkKey" value={checkKey} />
        <div className={cn("grid gap-2", hasVerkoper ? "grid-cols-2" : "grid-cols-1")}>
          {hasVerkoper ? <select name="side" className="select" aria-label="Aan wie"><option value="koper">Aan koper</option><option value="verkoper">Aan verkoper</option></select> : <input type="hidden" name="side" value="koper" />}
          <select name="kind" className="select" aria-label="Soort verzoek"><option value="document">Document</option><option value="vraag">Vraag</option></select>
        </div>
        <input name="title" className="input" placeholder="Bijv. bankafschrift ontvangst schenking" required />
        <textarea name="description" className="textarea" rows={2} placeholder="Toelichting voor de klant" />
        <p className="text-xs text-ink-500">De klant krijgt alleen deze vraag — zonder het formulier opnieuw te hoeven invullen.</p>
        <button className="btn btn-dark btn-sm justify-self-start"><Send className="h-4 w-4" />Verstuur verzoek</button>
      </form>
    </details>
  );
}

function DocLink({ id, title }: { id: string; title: string }) {
  return <a href={`/api/documenten/${id}?inline=1`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"><FileText className="h-3.5 w-3.5" />{title}</a>;
}

function CheckBody({ view, c, matrix, isNotary }: { view: DossierView; c: NotaryCheck; matrix: WwftRule[]; isNotary: boolean }) {
  const d = view.data;
  const id = view.dossier.id;
  switch (c.key) {
    case "wwft_id":
      return (
        <div className="space-y-4">
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-ink-500"><tr><th className="py-2 pr-4 font-medium">Betrokkene</th><th className="py-2 pr-4 font-medium">Identificatie</th><th className="py-2 pr-4 font-medium">Match koopovereenkomst</th><th className="py-2 font-medium">PEP</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {view.parties.map((p) => (
                  <tr key={p.id} className="align-middle"><td className="py-2.5 pr-4"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="font-medium text-ink-900">{p.displayName}</span><Badge tone={p.side === "koper" ? "koper" : "verkoper"}>{p.side}</Badge></span></td><td className="py-2.5 pr-4"><span className="inline-flex items-center gap-1.5"><StateIcon state={p.data.idcheck?.status === "voltooid" ? "done" : p.data.idcheck?.status === "in_behandeling" ? "in_progress" : "todo"} size="sm" />{p.data.idcheck?.provider ?? cap(label(ID_METHODE, p.data.idcheck?.methode, label(ID_STATUS, p.data.idcheck?.status, "te starten")))}{p.data.idcheck?.resultaat?.documentType ? ` · ${p.data.idcheck.resultaat.documentType}` : ""}</span></td><td className="whitespace-nowrap py-2.5 pr-4">{p.data.idcheck?.match ? (p.data.idcheck.match.naam && p.data.idcheck.match.geboortedatum ? <span className="inline-flex items-center gap-1 text-ok-700"><Check className="h-3.5 w-3.5" />naam en geboortedatum</span> : <span className="text-warn-700">afwijking</span>) : <span className="text-ink-400">—</span>}</td><td>{p.side === "verkoper" ? <span className="text-ink-400">n.v.t.</span> : p.data.pep?.antwoord === "ja" ? <Badge tone="bad">Ja</Badge> : p.data.pep?.antwoord === "nee" ? "Nee" : <span className="text-ink-400">open</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.financing.eigenMiddelen === "nee" ? <p className="text-sm text-ink-600">Koper brengt geen eigen middelen in.</p> : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Herkomst eigen middelen {d.wwft.ingediendOp ? `· aangeleverd ${dateTimeNl(d.wwft.ingediendOp)}` : "· nog niet ingediend"}</p>
              {d.wwft.bronnen.map((b) => {
                const rule = matrix.find((r) => r.type === b.type);
                const docs = view.documents.filter((x) => b.documentIds.includes(x.id));
                return (
                  <div key={b.id} className="rounded-xl border border-ink-100 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-ink-900">{rule?.label ?? b.type} · {euro(b.bedrag)}</span><span className="text-xs text-ink-500">{[label(WWFT_BESCHIKBAAR, b.beschikbaar, "beschikbaarheid onbekend"), label(WWFT_REKENING, b.rekening, "rekening onbekend"), label(WWFT_EIGENAAR, b.eigenaarGeld, "eigenaar onbekend")].join(" · ")}</span></div>
                    {Object.keys(b.details).length > 0 && <p className="mt-1 text-xs text-ink-600">{Object.entries(b.details).filter(([, v]) => v).map(([k, v]) => `${WWFT_DETAIL[k] ?? cap(k)}: ${v}`).join(" · ")}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{docs.length ? docs.map((x) => <DocLink key={x.id} id={x.id} title={x.title} />) : <span className="text-xs text-warn-700">Geen bewijsstukken</span>}</div>
                  </div>
                );
              })}
              <p className="text-xs text-ink-500">Totaal opgegeven: <strong>{euro(d.wwft.bronnen.reduce((s, b) => s + (b.bedrag ?? 0), 0))}</strong>. Status voor klant: “Wwft-informatie aangeleverd” — de beoordeling ligt bij u.</p>
            </div>
          )}
        </div>
      );
    case "volmachten":
      return (
        <ul className="divide-y divide-ink-100 text-sm">
          {view.parties.map((p) => {
            const v = p.data.volmacht ?? { status: "te_plannen" as const };
            const appt = view.appointments.find((a) => a.id === v.afspraakId);
            return (
              <li key={p.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2"><StateIcon state={["ondertekend", "verwerkt"].includes(v.status) ? "done" : v.status === "gepland" ? "in_progress" : "todo"} size="sm" /><span className="font-medium text-ink-900">{p.displayName}</span><Badge tone={p.side === "koper" ? "koper" : "verkoper"}>{p.side}</Badge></span>
                <span className="text-ink-600">{{ te_plannen: "Te plannen", gepland: `Gepland ${appt ? dateTimeNl(appt.startsAt) + ` (${appt.mode})` : ""}`, ondertekend: `Ondertekend ${dateNl(v.ondertekendOp, { short: true })}${v.ondertekeningMethode ? ` · ${v.ondertekeningMethode}` : ""}`, verwerkt: "Door notaris verwerkt" }[v.status]}{v.legalisatie === "vereist" ? " · legalisatie vereist" : v.legalisatie === "afgerond" ? " · gelegaliseerd" : ""}</span>
              </li>
            );
          })}
          <li className="flex flex-wrap gap-4 pt-3">{d.volmachtKoperDocId && <DocLink id={d.volmachtKoperDocId} title="Volmacht koper (concept)" />}{d.volmachtVerkoperDocId && <DocLink id={d.volmachtVerkoperDocId} title="Verkoopvolmacht (concept)" />}</li>
        </ul>
      );
    case "leveringsakte":
    case "hypotheekakte": {
      const a = c.key === "leveringsakte" ? d.akteLevering : d.akteHypotheek;
      const kind = c.key === "leveringsakte" ? "levering" : "hypotheek";
      return (
        <div className="space-y-3">
          {c.key === "hypotheekakte" && (
            <div className="rounded-xl bg-ink-50 p-3 text-sm">
              <p><span className="text-ink-500">Bankinstructie:</span> <strong>{label(BANK_STATUS, d.financing.bankinstructieStatus, "nog niet verwacht")}</strong>{d.financing.bankinstructie?.geldverstrekker ? ` · ${d.financing.bankinstructie.geldverstrekker}` : ""}{d.financing.bankinstructie?.kenmerk ? ` · kenmerk ${d.financing.bankinstructie.kenmerk}` : ""}</p>
              {d.financing.bankinstructie?.documentId && <div className="mt-1"><DocLink id={d.financing.bankinstructie.documentId} title="Originele hypotheekinstructie" /></div>}
              {isNotary && (
                <form action={`/api/notaris/${id}/bankinstructie`} method="post" encType="multipart/form-data" className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <FileField name="file" accept="application/pdf" required placeholder="Kies de hypotheekinstructie (pdf)" className="flex-1" />
                  <button className="btn btn-dark btn-sm"><Upload className="h-4 w-4" />{d.financing.bankinstructie ? "Nieuwe instructie delen" : "Bankinstructie veilig delen"}</button>
                </form>
              )}
              <p className="mt-2 text-xs text-ink-500">U blijft het primaire aanspreekpunt van de geldverstrekker. Na delen leest het platform de instructie uit en genereert het de concept-hypotheekakte.</p>
            </div>
          )}
          {a ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/notaris/dossiers/${id}/akte/${kind}`} className="btn btn-primary btn-sm"><Eye className="h-4 w-4" />Bekijk concept (versie {a.version})</Link>
              {a.documentId && <a href={`/api/documenten/${a.documentId}`} className="btn btn-secondary btn-sm"><Download className="h-4 w-4" />Download Word</a>}
              <span className="text-xs text-ink-500">{a.controlepunten.length} controlepunten · {a.bronnen.length} bronverwijzingen · {dateTimeNl(a.generatedAt)}</span>
            </div>
          ) : <p className="text-sm text-ink-500">{c.key === "leveringsakte" ? "Wordt gegenereerd zodra koopovereenkomst en kadastrale stukken verwerkt zijn." : "Wordt gegenereerd zodra de bankinstructie is gedeeld."}</p>}
        </div>
      );
    }
    case "aflosnotas":
      return (
        <div className="space-y-3">
          {view.payoffs.length === 0 && <p className="text-sm text-ink-600">Geen hypotheekinschrijvingen gevonden{view.verkopers.some((v) => v.data.meta?.zekerhedenBevestigd) ? "; verkoper heeft bevestigd." : "."}</p>}
          {view.payoffs.map((p) => (
            <div key={p.id} className="rounded-xl border border-ink-100 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-ink-900">{p.lender}</span><Badge tone={p.status === "gecontroleerd" ? "ok" : p.status === "ontvangen" ? "brand" : "neutral"}>{{ op_te_vragen: "Op te vragen", aangevraagd: "Aangevraagd", ontvangen: "Ontvangen", gecontroleerd: "Gecontroleerd" }[p.status]}</Badge></div>
              <p className="mt-1 text-xs text-ink-500">{p.inschrijving} · leningnummer {p.loanNumbers ?? "onbekend"} · toestemming verkoper: {p.toestemmingVerkoper ? "ja" : "nog niet"}{p.amount ? ` · af te lossen ${euro(p.amount / 100)}` : ""}{p.validUntil ? ` · geldig t/m ${dateNl(p.validUntil, { short: true })}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {p.requestDocumentId && <DocLink id={p.requestDocumentId} title="Verzoek aflosnota (concept)" />}
                {p.documentId && <DocLink id={p.documentId} title="Aflosnota" />}
                {isNotary && !d.gepasseerdOp && p.status === "op_te_vragen" && <form action={sendAflosnotaVerzoek.bind(null, id, p.id)}><button className="btn btn-dark btn-sm" disabled={!p.toestemmingVerkoper}><Send className="h-4 w-4" />Verzend verzoek</button></form>}
                {isNotary && p.status === "ontvangen" && <form action={markPayoffChecked.bind(null, id, p.id)}><button className="btn btn-ok btn-sm"><Check className="h-4 w-4" />Bedrag gecontroleerd</button></form>}
              </div>
              {isNotary && !d.gepasseerdOp && (p.status === "aangevraagd" || p.status === "op_te_vragen") && (
                <form action={`/api/notaris/${id}/aflosnota`} method="post" encType="multipart/form-data" className="mt-3 grid gap-2 rounded-lg bg-ink-50 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] sm:items-end">
                  <input type="hidden" name="payoffId" value={p.id} />
                  <span className="text-xs text-ink-600 sm:col-span-4">Aflosnota ontvangen? Registreer bedrag en geldigheid.</span>
                  <FileField name="file" accept="application/pdf" placeholder="Aflosnota (pdf, optioneel)" />
                  <label className="block"><span className="sr-only">Af te lossen bedrag</span><input name="amount" className="input py-[0.4375rem] text-sm" placeholder="Bedrag €" inputMode="decimal" required /></label>
                  <label className="block"><span className="sr-only">Geldig tot en met</span><input name="validUntil" type="date" lang="nl" className="input py-[0.4375rem] text-sm" title="Geldig tot en met" /></label>
                  <button className="btn btn-secondary btn-sm">Registreer</button>
                </form>
              )}
            </div>
          ))}
        </div>
      );
    case "nota": {
      const nk = notaKoper(view);
      const nv = view.verkopers.length ? notaVerkoper(view) : null;
      return (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-ink-100 p-4"><p className="text-sm font-semibold text-ink-900">Koper <span className="font-normal text-ink-500">· {label(NOTA_STATUS, d.notaKoper?.status, "in voorbereiding")}</span></p><NotaTable nota={nk} side="koper" /><p className="mt-2 text-xs text-ink-500">Restant naar: {formatIban(d.koperIban.iban) || "—"} t.n.v. {d.koperIban.tenaamstelling ?? "—"}</p></div>
            {nv && <div className="rounded-xl border border-ink-100 p-4"><p className="text-sm font-semibold text-ink-900">Verkoper <span className="font-normal text-ink-500">· {label(NOTA_STATUS, d.notaVerkoper?.status, "in voorbereiding")}</span></p><NotaTable nota={nv} side="verkoper" /><p className="mt-2 text-xs text-ink-500">Uitbetaling naar: {formatIban(view.verkopers[0]?.data.iban?.iban) || "—"} t.n.v. {view.verkopers[0]?.data.iban?.tenaamstelling ?? "—"}</p></div>}
          </div>
          {isNotary && !d.afgewikkeldOp && !(d.notaKoper?.status === "definitief" && (!nv || d.notaVerkoper?.status === "definitief")) && (
            <div className="flex flex-wrap gap-2">
              <form action={publishNotas.bind(null, id, "beschikbaar")}><button className="btn btn-secondary btn-sm"><Send className="h-4 w-4" />Delen met partijen (concept)</button></form>
              <form action={publishNotas.bind(null, id, "definitief")}><button className="btn btn-dark btn-sm"><Gavel className="h-4 w-4" />Definitief vaststellen</button></form>
            </div>
          )}
        </div>
      );
    }
    case "passeren":
      return (
        <div className="space-y-3 text-sm">
          <ul className="space-y-1.5">
            {view.checks.filter((x) => x.key !== "passeren").sort((a, b) => Object.keys(CHECK_NAMES).indexOf(a.key) - Object.keys(CHECK_NAMES).indexOf(b.key)).map((x) => <li key={x.key} className="flex items-center gap-2"><StateIcon state={x.status === "akkoord" ? "done" : "todo"} size="sm" />{CHECK_NAMES[x.key] ?? x.key}</li>)}
            <li className="flex items-center gap-2"><StateIcon state={d.datumCheck.antwoord === "ja" || d.datumCheck.antwoord === "nee_nieuwe_datum" ? "done" : "todo"} size="sm" />Overdrachtsdatum bevestigd door koper ({dateNl(d.transaction.leveringsdatum)})</li>
            <li className="flex items-center gap-2"><StateIcon state="waiting" size="sm" />Her-recherche Kadaster en ontvangst gelden op kwaliteitsrekening (buiten platform)</li>
          </ul>
          {isNotary && !d.gepasseerdOp && <form action={passeren.bind(null, id)}><button className="btn btn-primary w-full whitespace-normal text-left sm:w-auto" disabled={!c.ready}><Gavel className="h-4 w-4 shrink-0" />Passeren en aanbieden ter inschrijving</button></form>}
          {d.gepasseerdOp && <p className="rounded-xl bg-ok-50 p-3 text-ok-700">Gepasseerd {dateTimeNl(d.gepasseerdOp)}{d.ingeschrevenOp ? ` · ingeschreven ${dateTimeNl(d.ingeschrevenOp)}` : ""}</p>}
          {isNotary && d.gepasseerdOp && !d.afgewikkeldOp && <form action={afwikkelen.bind(null, id)}><button className="btn btn-ok w-full whitespace-normal text-left sm:w-auto"><Check className="h-4 w-4" />Inschrijving bevestigd — afwikkelen en uitbetalen</button></form>}
          {d.afgewikkeldOp && <p className="rounded-xl bg-ok-50 p-3 text-ok-700">Afgewikkeld {dateTimeNl(d.afgewikkeldOp)}</p>}
        </div>
      );
  }
}

