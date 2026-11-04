import Link from "next/link";
import { Check, Eye, FileCheck2, Landmark, Map, ShieldCheck, Clock, CalendarCheck, Send, AlertTriangle, ScrollText, Receipt } from "lucide-react";
import type { PartyAccess } from "@/lib/auth/guards";
import { Card, KV, Notice, StateIcon } from "@/components/ui";
import { Radio, WhyBox } from "./frame";
import { saveWoning, saveStarters, signStartersVerklaring, savePep, submitWwft, answerDatumCheck, approveNota } from "@/app/portaal/actions";
import { WwftTool } from "./wwft-tool";
import { UploadButton } from "../upload";
import { getWwftMatrix } from "@/lib/domain/settings";
import { eigenGeldIndicatie, overdrachtsbelasting } from "@/lib/domain/calc";
import { NOTARY_OFFICE, TERMS, taxYearFor, DVO_VERSION } from "@/lib/config";
import { addDays, dateNl, dateTimeNl, euro, formatIban, propertyLine } from "@/lib/util/format";
import { NotaTable } from "./nota-table";

export function AanmeldenStep({ a }: { a: PartyAccess }) {
  const dvo = a.view.data.dvo;
  const doc = a.view.documents.find((d) => d.kind === "dvo");
  return (
    <Card className="p-6">
      {dvo ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-ok-700"><Check className="h-5 w-5" />Dienstverleningsovereenkomst digitaal getekend</p>
          <KV className="mt-4" rows={[["Versie", dvo.version], ["Getekend door", dvo.signatureName], ["Tijdstip", dateTimeNl(dvo.acceptedAt)], ["Bevestigingen", `${dvo.checks.length} van 4 aangevinkt`], ["Akkoordbewijs", dvo.hash ? <span className="font-mono text-xs">{dvo.hash.slice(0, 16)}…</span> : "—"]]} />
          {doc && <a href={`/api/documenten/${doc.id}`} className="btn btn-secondary btn-sm mt-4">Download akkoordbewijs</a>}
        </>
      ) : <p>De dienstverleningsovereenkomst ({DVO_VERSION}) is nog niet getekend.</p>}
    </Card>
  );
}

export function KoStep({ a }: { a: PartyAccess }) {
  const d = a.view.data;
  const doc = a.view.documents.find((x) => x.kind === "koopovereenkomst");
  return (
    <div className="space-y-5">
      <Card className="p-6">
        {doc ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3"><FileCheck2 className="h-6 w-6 shrink-0 text-ok-600" /><div><p className="font-semibold text-ink-900">{doc.filename}</p><p className="text-sm text-ink-500">Ontvangen {dateNl(doc.createdAt)} · uitgelezen via {d.extractie?.methode === "ai" ? "AI-herkenning" : "regelgebaseerde herkenning"}</p></div></div>
            <div className="flex gap-2"><Link href={`/portaal/${a.view.dossier.id}/document/${doc.id}`} className="btn btn-secondary btn-sm"><Eye className="h-4 w-4" />Bekijk</Link><UploadButton dossierId={a.view.dossier.id} kind="koopovereenkomst" label="Nieuwe versie" /></div>
          </div>
        ) : (
          <div className="text-center"><p className="font-semibold text-ink-900">Nog geen getekende koopovereenkomst ontvangen</p><p className="mt-1 text-sm text-ink-600">Upload de volledige overeenkomst inclusief bijlagen en aanvullingen.</p><div className="mt-4"><UploadButton dossierId={a.view.dossier.id} kind="koopovereenkomst" label="Upload koopovereenkomst" variant="primary" back={`/portaal/${a.view.dossier.id}/stap/gegevens`} /></div></div>
        )}
      </Card>
      {doc && (
        <Card className="p-6">
          <h3 className="font-bold text-ink-900">Wat we eruit hebben gehaald</h3>
          <KV className="mt-3" rows={[
            ["Woning", propertyLine(d.property)],
            ["Kadastraal", d.property.kadastraal?.perceel ? `${d.property.kadastraal.gemeente} ${d.property.kadastraal.sectie} ${d.property.kadastraal.perceel}` : "—"],
            ["Koopprijs", euro(d.transaction.koopprijs)],
            ["Roerende zaken", euro(d.transaction.roerendeZaken)],
            ["Datum ondertekening", dateNl(d.transaction.datumOndertekening)],
            ["Leveringsdatum (oorspronkelijk)", dateNl(d.transaction.leveringsdatumOrigineel)],
            ["Waarborgsom", d.transaction.waarborgsom?.bedrag ? `${euro(d.transaction.waarborgsom.bedrag)} uiterlijk ${dateNl(d.transaction.waarborgsom.uiterlijk)}` : "—"],
            ["Financieringsvoorbehoud", d.transaction.financieringsvoorbehoud?.datum ? `${euro(d.transaction.financieringsvoorbehoud.bedrag)} tot ${dateNl(d.transaction.financieringsvoorbehoud.datum)}` : "—"],
            ["Gekozen notaris", d.transaction.notarisInKo ?? "—"],
          ]} />
          {(d.transaction.bijzondereBepalingen ?? []).length > 0 && <p className="mt-4 text-sm text-ink-600">Bijzondere bepalingen: {(d.transaction.bijzondereBepalingen ?? []).map((b) => b.titel).join(", ")} — de notaris beoordeelt deze.</p>}
        </Card>
      )}
    </div>
  );
}

const sel = (name: string, value: string | undefined, opts: [string, string][], required = false) => (
  <select className="select" name={name} defaultValue={value ?? ""} required={required}><option value="">Kies…</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
);

export function WoningStep({ a }: { a: PartyAccess }) {
  const d = a.view.data;
  const f = d.financing;
  return (
    <form action={saveWoning.bind(null, a.view.dossier.id)} className="space-y-6">
      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-bold text-ink-900"><Map className="h-5 w-5 text-brand-600" />De woning</h3>
        <KV className="mt-3" rows={[["Adres", propertyLine(d.property)], ["Kadastrale aanduiding", d.property.kadastraal?.perceel ? `${d.property.kadastraal.gemeente} ${d.property.kadastraal.sectie} ${d.property.kadastraal.perceel}${d.property.kadastraal.grootte ? `, groot ${d.property.kadastraal.grootte}` : ""}` : "Wordt opgezocht"], ["Bouwjaar / oppervlakte", d.property.bouwjaar ? `${d.property.bouwjaar} · ${d.property.oppervlakte ?? "?"} m²` : "—"], ["Koopprijs", euro(d.transaction.koopprijs)]]} />
        <label className="mt-4 block max-w-xs"><span className="label">Soort woning</span>{sel("soort", d.property.soort ?? "woning", [["woning", "Woonhuis"], ["appartement", "Appartement(srecht)"], ["overig", "Anders"]])}</label>
      </Card>
      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-bold text-ink-900"><Landmark className="h-5 w-5 text-brand-600" />Financiering</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Wordt er een hypotheek gevestigd voor deze aankoop?</span>{sel("hypotheek", f.hypotheek, [["ja", "Ja"], ["nee", "Nee"], ["onbekend", "Nog niet bekend"]], true)}</label>
          <label className="block"><span className="label">Bij welke geldverstrekker loopt de aanvraag?</span><input className="input" name="geldverstrekker" defaultValue={f.geldverstrekker ?? ""} /></label>
          <label className="block"><span className="label">Wat is de status van je hypotheek?</span>{sel("status", f.status, [["aanvraag_loopt", "Aanvraag loopt"], ["offerte_ontvangen", "Offerte ontvangen"], ["offerte_geaccepteerd", "Offerte geaccepteerd"], ["rond", "Financiering rond"], ["weet_niet", "Weet ik niet"]])}</label>
          <label className="block"><span className="label">Hypotheekbedrag (indicatie, €)</span><input className="input" name="hypotheekbedrag" inputMode="numeric" defaultValue={f.hypotheekbedragIndicatie?.toLocaleString("nl-NL") ?? ""} /></label>
          <label className="block"><span className="label">Is er een overbruggingshypotheek?</span>{sel("overbrugging", f.overbrugging, [["nee", "Nee"], ["ja", "Ja"], ["weet_niet", "Weet ik niet"]])}</label>
          <label className="block"><span className="label">Zijn er meerdere geldverstrekkers betrokken?</span>{sel("meerdere", f.meerdereGeldverstrekkers, [["nee", "Nee"], ["ja", "Ja"]])}</label>
          <label className="sm:col-span-2 block"><span className="label">Zo ja: welke andere geldverstrekkers?</span><input className="input" name="andere" defaultValue={f.andereGeldverstrekkers ?? ""} /></label>
          <label className="sm:col-span-2 block"><span className="label">Breng je eigen geld of andere middelen in voor de aankoop of bijkomende kosten?</span>{sel("eigenMiddelen", f.eigenMiddelen, [["ja", "Ja"], ["nee", "Nee"], ["weet_niet", "Weet ik nog niet"]], true)}</label>
        </div>
        <div className="mt-6 border-t border-ink-100 pt-5">
          <p className="text-sm font-semibold text-ink-900">Hypotheekadviseur (optioneel)</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <input className="input" name="adviseurNaam" placeholder="Naam" defaultValue={f.adviseur?.naam ?? ""} />
            <input className="input" name="adviseurKantoor" placeholder="Kantoor" defaultValue={f.adviseur?.kantoor ?? ""} />
            <input className="input" name="adviseurEmail" type="email" placeholder="E-mail" defaultValue={f.adviseur?.email ?? ""} />
          </div>
        </div>
      </Card>
      <Notice tone="info">Je hoeft je hypotheekofferte niet te uploaden. De geldverstrekker stuurt de hypotheekinstructie rechtstreeks naar de notaris. Geef je adviseur door dat {NOTARY_OFFICE.notaryShort} ({NOTARY_OFFICE.officeName}) de akten passeert, onder dossiernummer {a.view.dossier.reference}.</Notice>
      <div className="flex justify-end"><button className="btn btn-primary"><Check className="h-4 w-4" />Opslaan</button></div>
    </form>
  );
}

export function StartersStep({ a }: { a: PartyAccess }) {
  const d = a.view.data;
  const tax = taxYearFor(d.transaction.leveringsdatum);
  const ob = overdrachtsbelasting(a.view);
  return (
    <div className="space-y-5" data-tour="starters-uitkomst">
      <Card className="p-5 text-sm">
        <p className="text-ink-700">Leveringsdatum <strong>{dateNl(d.transaction.leveringsdatum)}</strong> · woningwaardegrens {tax.year}: <strong>€ {tax.startersGrens.toLocaleString("nl-NL")}</strong>{tax.status === "onder voorbehoud" && <span className="text-warn-700"> (onder voorbehoud)</span>} · koopprijs <strong>{euro(d.transaction.koopprijs)}</strong></p>
      </Card>
      {a.mine.map((p) => {
        const s = p.data.starters ?? {};
        const regel = ob.regels.find((r) => r.partyId === p.id);
        const verklaring = a.view.documents.find((x) => x.kind === "verklaring_starters" && x.partyId === p.id);
        return (
          <Card key={p.id} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-ink-900">{p.displayName}</h3>
              <span className={`chip ${s.preselectie === "mogelijk" ? "bg-ok-100 text-ok-700" : s.preselectie === "niet" ? "bg-ink-100 text-ink-600" : "bg-warn-100 text-warn-700"}`}>{s.preselectie === "mogelijk" ? "Komt mogelijk in aanmerking" : s.preselectie === "niet" ? "Niet van toepassing" : "Nog niet te beoordelen"}</span>
            </div>
            <p className="mt-2 text-sm text-ink-600">Automatische toets: {s.reden ?? "wacht op geboortedatum, koopprijs en leveringsdatum"}.</p>
            {regel && <p className="mt-1 text-sm text-ink-600">Indicatie overdrachtsbelasting over jouw aandeel ({Math.round(regel.aandeel * 100)}%): <strong className="text-ink-900">{euro(regel.bedrag)}</strong> — {regel.grond}.</p>}
            {s.preselectie === "mogelijk" && (
              <form action={saveStarters.bind(null, a.view.dossier.id, p.id)} className="mt-5 space-y-4 border-t border-ink-100 pt-5">
                <div><p className="label">1. Ga je de woning zelf, anders dan tijdelijk, als hoofdverblijf gebruiken?</p><Radio name="hoofdverblijf" value={s.hoofdverblijf} options={[["ja", "Ja"], ["nee", "Nee"]]} required /></div>
                <div><p className="label">2. Heb je eerder gebruikgemaakt van de startersvrijstelling voor overdrachtsbelasting?</p><Radio name="eerderGebruikt" value={s.eerderGebruikt} options={[["nee", "Nee"], ["ja", "Ja"], ["weet_niet", "Weet ik niet"]]} required /></div>
                <div><p className="label">3. Wil je, als je aan alle voorwaarden voldoet, gebruikmaken van de startersvrijstelling voor deze aankoop?</p><Radio name="wilGebruiken" value={s.wilGebruiken} options={[["ja", "Ja"], ["nee", "Nee"]]} required /></div>
                <button className="btn btn-primary btn-sm">Antwoorden opslaan</button>
              </form>
            )}
            {s.uitkomst === "vrijstelling" && verklaring && (
              <div className="mt-5 flex flex-col gap-3 rounded-xl bg-ok-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-800">{s.verklaringGetekendOp ? <><Check className="mr-1 inline h-4 w-4 text-ok-600" />Verklaring getekend op {dateNl(s.verklaringGetekendOp)}. De notaris controleert de voorwaarden voordat de vrijstelling wordt toegepast.</> : "Je verklaring startersvrijstelling staat klaar om te tekenen."}</p>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/portaal/${a.view.dossier.id}/document/${verklaring.id}`} className="btn btn-secondary btn-sm"><Eye className="h-4 w-4" />Bekijk</Link>
                  {!s.verklaringGetekendOp && p.id === a.me.id && <form action={signStartersVerklaring.bind(null, a.view.dossier.id, p.id)}><button className="btn btn-ok btn-sm"><ScrollText className="h-4 w-4" />Digitaal tekenen</button></form>}
                </div>
              </div>
            )}
          </Card>
        );
      })}
      <WhyBox title="Goed om te weten">
        <p>De toets gebeurt per koper op basis van je leeftijd op de leveringsdatum en de woningwaardegrens van dat jaar. Een positieve voorselectie is nog geen fiscale beoordeling: de notaris controleert de voorwaarden.</p>
        <p>Ligt de woningwaarde boven de grens, dan vervalt de vrijstelling helemaal. <Link href="/kennisbank/startersvrijstelling" className="text-brand-700 underline">Lees meer</Link>.</p>
      </WhyBox>
    </div>
  );
}

export async function WwftStep({ a }: { a: PartyAccess }) {
  const d = a.view.data;
  const matrix = await getWwftMatrix();
  const docs = a.view.documents.filter((x) => x.kind === "wwft_bewijs").map((x) => ({ id: x.id, title: x.title, meta: x.meta }));
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-bold text-ink-900"><ShieldCheck className="h-5 w-5 text-brand-600" />Politiek prominent persoon (PEP)</h3>
        <p className="mt-1 text-sm text-ink-600">Ben je een politiek prominent persoon (PEP), of een direct familielid of naaste geassocieerde van een PEP? Bijvoorbeeld een minister, Kamerlid, rechter, ambassadeur of bestuurder van een staatsbedrijf.</p>
        <div className="mt-4 space-y-3">
          {a.mine.map((p) => (
            <form key={p.id} action={savePep.bind(null, a.view.dossier.id, p.id)} className="flex flex-col gap-3 rounded-xl bg-ink-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-medium text-ink-900"><StateIcon state={p.data.pep?.antwoord ? "done" : "todo"} size="sm" />{p.displayName}</span>
              <div className="flex items-center gap-2"><Radio name="pep" value={p.data.pep?.antwoord} options={[["nee", "Nee"], ["ja", "Ja"]]} required /><button className="btn btn-dark btn-sm">Opslaan</button></div>
            </form>
          ))}
        </div>
      </Card>
      {d.financing.eigenMiddelen === "nee" ? (
        <Notice tone="info" title="Geen eigen middelen">Je hebt aangegeven geen eigen geld in te brengen. Dan hoef je geen herkomstvragen te beantwoorden. De notaris kan nog aanvullende vragen stellen.</Notice>
      ) : (
        <Card className="p-6">
          <h3 className="font-bold text-ink-900">Herkomst van eigen middelen</h3>
          <p className="mt-1 text-sm text-ink-600">Geef per geldbron aan om welk bedrag het gaat en upload direct de stukken die de notaris daarvoor vraagt. Je kunt meerdere bronnen toevoegen.</p>
          <div className="mt-5"><WwftTool dossierId={a.view.dossier.id} bronnen={d.wwft.bronnen} matrix={matrix} docs={docs} indicatie={eigenGeldIndicatie(a.view)} /></div>
          <form action={submitWwft.bind(null, a.view.dossier.id)} className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center">
            <p className="text-sm text-ink-600">{d.wwft.ingediendOp ? `Aangeleverd op ${dateTimeNl(d.wwft.ingediendOp)}.` : "Klaar? Lever de informatie aan bij de notaris."}</p>
            <button className="btn btn-primary" disabled={!d.wwft.bronnen.length}><Send className="h-4 w-4" />{d.wwft.ingediendOp ? "Opnieuw aanleveren" : "Wwft-informatie aanleveren"}</button>
          </form>
        </Card>
      )}
      <WhyBox>
        <p>De notaris is op grond van de Wet ter voorkoming van witwassen en financieren van terrorisme (Wwft) verplicht om te weten waar het geld voor je aankoop vandaan komt.</p>
        <p>Deze vragenlijst is gestructureerde voorinformatie. Hij vervangt niet het onderzoek van de notaris; die kan altijd aanvullende stukken vragen. Na indienen is de status ‘Wwft-informatie aangeleverd’ — niet ‘goedgekeurd’.</p>
      </WhyBox>
    </div>
  );
}

export function DossierStep({ a }: { a: PartyAccess }) {
  const d = a.view.data;
  const k = d.kadaster;
  const items = [
    { t: "Kadastrale gegevens", s: k.status === "op_te_halen" ? "Op te halen" : k.status === "nader_onderzoek" ? "Nader onderzoek" : `Opgehaald ${dateNl(k.opgehaaldOp, { short: true })}`, ok: k.status === "opgehaald" },
    { t: "Kadastrale kaart", s: a.view.documents.some((x) => x.kind === "kadaster_kaart") ? "Opgehaald" : "—", ok: a.view.documents.some((x) => x.kind === "kadaster_kaart") },
    { t: "Erfdienstbaarheden en kwalitatieve verplichtingen", s: `${(k.registraties ?? []).filter((r) => r.type === "erfdienstbaarheid" || r.type === "kwalitatieve_verplichting").length} gevonden`, ok: k.status === "opgehaald" },
    { t: "Eerdere leveringsakte", s: k.vorigeAkte?.deel ? `Hyp4 ${k.vorigeAkte.deel}/${k.vorigeAkte.nummer}` : "—", ok: !!k.vorigeAkte?.deel },
    { t: "Concept-leveringsakte", s: d.akteLevering ? { in_voorbereiding: "In voorbereiding", gegenereerd: "Gegenereerd", ter_controle_notaris: "Ter controle notaris", goedgekeurd: "Goedgekeurd door notaris", definitief: "Definitief" }[d.akteLevering.status] : "In voorbereiding", ok: !!d.akteLevering },
  ];
  const kaart = a.view.documents.find((x) => x.kind === "kadaster_kaart");
  return (
    <div className="space-y-5">
      <Card className="divide-y divide-ink-100 p-0">
        {items.map((i) => <div key={i.t} className="flex items-center justify-between gap-4 p-4"><span className="flex items-center gap-3 text-sm font-medium text-ink-900"><StateIcon state={i.ok ? "done" : "waiting"} size="sm" />{i.t}</span><span className="text-sm text-ink-600">{i.s}</span></div>)}
      </Card>
      {kaart && <Link href={`/portaal/${a.view.dossier.id}/document/${kaart.id}`} className="btn btn-secondary"><Map className="h-4 w-4" />Bekijk de kadastrale kaart</Link>}
      <Notice tone="info">Je hoeft hier niets voor te doen. De concept-akte wordt eerst door de notaris gecontroleerd; daarna ontvang je de akte ter inzage.</Notice>
    </div>
  );
}

export function HypotheekStep({ a }: { a: PartyAccess }) {
  const f = a.view.data.financing;
  const st = f.bankinstructieStatus ?? "nog_niet_verwacht";
  const order = ["nog_niet_verwacht", "verwacht", "ontvangen", "in_behandeling"] as const;
  const labels = { nog_niet_verwacht: "Nog niet verwacht", verwacht: "Verwacht", ontvangen: "Ontvangen", in_behandeling: "In behandeling" };
  const lev = a.view.data.transaction.leveringsdatum;
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <p className="text-sm text-ink-600">Hypotheekinstructie van <strong className="text-ink-900">{f.bankinstructie?.geldverstrekker ?? f.geldverstrekker ?? "je geldverstrekker"}</strong></p>
        <ol className="mt-4 grid grid-cols-4 gap-2">{order.map((o, i) => <li key={o} className="text-center"><div className={`h-1.5 rounded-full ${i <= order.indexOf(st) ? "bg-ok-600" : "bg-ink-100"}`} /><p className={`mt-2 text-xs font-medium ${i <= order.indexOf(st) ? "text-ink-900" : "text-ink-400"}`}>{labels[o]}</p></li>)}</ol>
        {f.bankinstructie?.hypotheekbedrag && <KV className="mt-5" rows={[["Hypotheekbedrag", euro(f.bankinstructie.hypotheekbedrag)], ["Leningdelen", (f.bankinstructie.leningdelen ?? []).map((l) => `${l.soort}: ${euro(l.bedrag)}`).join(" · ") || "—"], ["Concept-hypotheekakte", a.view.data.akteHypotheek ? `Versie ${a.view.data.akteHypotheek.version} — ter controle bij de notaris` : "Volgt"]]} />}
        {st !== "ontvangen" && st !== "in_behandeling" && lev && <p className="mt-4 flex items-center gap-2 text-sm text-ink-600"><Clock className="h-4 w-4" />We verwachten de instructie uiterlijk {dateNl(addDays(lev, -TERMS.bankinstructieUiterlijkDagenVooraf))}. Blijft hij uit, dan sturen we je en je adviseur een seintje.</p>}
      </Card>
      <WhyBox title="Wat moet ik doen?"><p>Niets, behalve je adviseur laten weten welke notaris de akten passeert: <strong>{NOTARY_OFFICE.notaryShort}, {NOTARY_OFFICE.officeName}</strong>, dossiernummer <strong>{a.view.dossier.reference}</strong>.</p></WhyBox>
    </div>
  );
}

export function LaatsteCheckStep({ a }: { a: PartyAccess }) {
  const d = a.view.data;
  const lev = d.transaction.leveringsdatum;
  const nota = d.notaKoper;
  return (
    <div className="space-y-5">
      <Card className="p-6" data-tour="datumcheck">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-700"><CalendarCheck className="h-4 w-4" />Overdrachtsdatum</p>
        <p className="mt-2 text-lg text-ink-800">In onze gegevens staat dat de overdracht van je woning gepland staat op <strong className="text-ink-900">{dateNl(lev, { weekday: true })}</strong>.</p>
        {d.datumCheck.antwoord ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok-50 p-4 text-sm text-ok-700"><Check className="h-4 w-4" />{d.datumCheck.antwoord === "ja" ? `Bevestigd op ${dateNl(d.datumCheck.beantwoordOp)}.` : d.datumCheck.antwoord === "nee_nieuwe_datum" ? `Nieuwe datum doorgegeven: ${dateNl(d.datumCheck.nieuweDatum)}. De oorspronkelijke datum (${dateNl(d.transaction.leveringsdatumOrigineel)}) is bewaard en de notaris is geïnformeerd.` : "Nieuwe datum nog niet bekend — we vragen het later opnieuw."}</p>
        ) : (
          <form action={answerDatumCheck.bind(null, a.view.dossier.id)} className="mt-5 space-y-4">
            <p className="label">Is dit nog steeds de afgesproken datum?</p>
            <Radio name="antwoord" options={[["ja", "Ja"], ["nee_nieuwe_datum", "Nee, nieuwe datum afgesproken"], ["onbekend", "Nieuwe datum nog niet bekend"]]} required />
            <label className="block max-w-xs"><span className="label">Nieuwe datum (alleen bij wijziging)</span><input type="date" name="nieuweDatum" className="input" /></label>
            <button className="btn btn-primary"><Check className="h-4 w-4" />Bevestigen</button>
          </form>
        )}
      </Card>
      <Card className="p-6">
        <p className="flex items-center gap-2 font-bold text-ink-900"><Receipt className="h-5 w-5 text-brand-600" />Nota van afrekening</p>
        {nota && nota.status !== "in_voorbereiding" ? (
          <>
            <NotaTable nota={nota} side="koper" />
            {nota.saldo > 0 && <Notice tone="warn" className="mt-4" icon={<AlertTriangle className="h-4 w-4 text-warn-700" />}>Maak <strong>{euro(nota.saldo)}</strong> over naar de kwaliteitsrekening van de notaris ({NOTARY_OFFICE.kwaliteitsrekening}) o.v.v. {a.view.dossier.reference}. De notaris geeft de uiterste datum aan.</Notice>}
            <form action={approveNota.bind(null, a.view.dossier.id)} className="mt-4"><button className="btn btn-secondary btn-sm"><Check className="h-4 w-4" />Ik heb de nota gezien</button></form>
          </>
        ) : <p className="mt-2 text-sm text-ink-600">De notaris stelt de nota van afrekening op kort voor de overdracht. Je ontvangt bericht zodra hij beschikbaar is.</p>}
      </Card>
      <Card className="p-6">
        <p className="font-bold text-ink-900">Laatste controle van je gegevens</p>
        <KV className="mt-3" rows={[["Kopers", a.mine.map((p) => p.displayName).join(", ")], ["Uitbetalingsrekening", d.koperIban.iban ? `${formatIban(d.koperIban.iban)} t.n.v. ${d.koperIban.tenaamstelling}` : "—"], ["Volmachten", a.mine.map((p) => `${p.displayName.split(" ")[0]}: ${p.data.volmacht?.status ?? "te plannen"}`).join(" · ")], ["Documenten", `${a.view.documents.filter((x) => x.visibility !== "intern").length} in je dossier`]]} />
        <p className="mt-3 text-sm text-ink-500">Klopt er iets niet? Pas het aan in de betreffende stap of neem contact met ons op.</p>
      </Card>
    </div>
  );
}

