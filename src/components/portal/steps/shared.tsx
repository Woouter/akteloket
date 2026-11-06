import Link from "next/link";
import { BadgeCheck, CalendarCheck, Check, Download, Eye, Fingerprint, Landmark, Smartphone, Video, Building2, FileSignature, Stamp, Send } from "lucide-react";
import type { PartyAccess } from "@/lib/auth/guards";
import type { Party } from "@/lib/db/schema";
import { Card, Notice, StateIcon } from "@/components/ui";
import { SourceTag } from "@/components/aanvraag/fields";
import { Radio, meFirst } from "./frame";
import { CivilStatusFields } from "./civil-status";
import { saveGegevens, saveIban, bookVolmacht, inviteCoParty, chooseLegalisatie } from "@/app/portaal/actions";
import { getOffice, slots } from "@/lib/domain/settings";
import { dateNl, dateTimeNl, formatIban, personName } from "@/lib/util/format";
import { NOTARY_OFFICE } from "@/lib/config";
import { UploadButton } from "../upload";
import type { FieldMeta } from "@/lib/domain/types";

function tag(meta: Record<string, FieldMeta> | undefined, k: string, v: unknown) {
  const m = meta?.[k] ?? meta?.[k === "voornamen" || k === "achternaam" ? "naam" : k];
  if (!v) return <SourceTag s={{ state: "missing" }} className="mt-1" />;
  if (m?.source === "koopovereenkomst") return <SourceTag s={{ state: (m.confidence ?? 1) < 0.75 ? "uncertain" : "extracted", page: m.page, snippet: m.snippet }} className="mt-1" />;
  if (m?.source === "klant") return <SourceTag s={{ state: m.changedFrom ? "edited" : "manual", snippet: m.changedFrom || undefined }} className="mt-1" />;
  return null;
}

/** Invoerveld met bronlabel onder het veld (zo blijven velden in een rij op één lijn). */
function In({ label, name, value, meta, type = "text", className, children }: { label: string; name: string; value?: string; meta?: Record<string, FieldMeta>; type?: string; className?: string; children?: React.ReactNode }) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children ?? <input className="input" name={name} type={type} defaultValue={value ?? ""} data-state={meta?.[name]?.source === "koopovereenkomst" || meta?.naam?.source === "koopovereenkomst" ? (value ? "extracted" : "missing") : undefined} />}
      {tag(meta, name, value)}
    </label>
  );
}

export function GegevensStep({ a }: { a: PartyAccess }) {
  const koper = a.side === "koper";
  return (
    <div className="space-y-6" data-tour="step-form">
      <Notice tone="info">Groen gemarkeerde gegevens hebben we uit de koopovereenkomst gehaald. Controleer ze en vul aan wat ontbreekt. Wijzigingen leggen we vast, zodat de notaris kan zien wat je hebt aangepast.</Notice>
      {meFirst(a).map((p, i) => <PersonForm key={p.id} a={a} p={p} index={i} koper={koper} />)}
    </div>
  );
}

function PersonForm({ a, p, index, koper }: { a: PartyAccess; p: Party; index: number; koper: boolean }) {
  const d = p.data.person;
  const meta = p.data.meta;
  const isMe = p.id === a.me.id;
  const first = d.roepnaam ?? d.voornamen?.split(" ")[0] ?? (koper ? "deze koper" : "deze verkoper");
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg text-ink-900"><StateIcon state={p.data.gegevensBevestigd ? "done" : "todo"} size="sm" />{personName(d) || `${koper ? "Koper" : "Verkoper"} ${index + 1}`}{isMe && <span className="chip bg-ink-100 font-sans text-ink-600">jij</span>}</h3>
        {p.data.gegevensBevestigd && <span className="text-xs text-ok-700">Bevestigd {dateNl(p.data.gegevensBevestigdOp, { short: true })}</span>}
      </div>
      <form action={saveGegevens.bind(null, a.view.dossier.id, p.id)} className="mt-5 grid gap-4 sm:grid-cols-6">
        <In className="sm:col-span-3" label="Voornamen (voluit)" name="voornamen" value={d.voornamen} meta={meta} />
        <In className="sm:col-span-3" label="Achternaam" name="achternaam" value={d.achternaam} meta={meta} />
        <In className="sm:col-span-2" label="Geboortedatum" name="geboortedatum" type="date" value={d.geboortedatum} meta={meta} />
        <In className="sm:col-span-2" label="Geboorteplaats" name="geboorteplaats" value={d.geboorteplaats} meta={meta} />
        <In className="sm:col-span-2" label="Nationaliteit" name="nationaliteit" value={d.nationaliteit ?? "Nederlandse"} meta={meta} />
        <In className="sm:col-span-3" label="Huidig adres" name="adres" value={d.adres} meta={meta} />
        <In className="sm:col-span-1" label="Postcode" name="postcode" value={d.postcode} meta={meta} />
        <In className="sm:col-span-2" label="Woonplaats" name="woonplaats" value={d.woonplaats} meta={meta} />
        <CivilStatusFields
          staat={d.burgerlijkeStaat} voorwaarden={d.huwelijkseVoorwaarden} partnerNaam={d.partnerNaam} partnerDatum={d.partnerDatum}
          tags={{ staat: tag(meta, "burgerlijkeStaat", d.burgerlijkeStaat), voorwaarden: tag(meta, "huwelijkseVoorwaarden", d.huwelijkseVoorwaarden), partnerNaam: tag(meta, "partnerNaam", d.partnerNaam), partnerDatum: tag(meta, "partnerDatum", d.partnerDatum) }}
          missing={{ partnerNaam: !d.partnerNaam, partnerDatum: !d.partnerDatum }}
        />
        {koper && (
          <>
            <div className="sm:col-span-6 mt-2 border-t border-ink-100 pt-5"><h4 className="font-sans text-base font-semibold text-ink-900">Eigendom</h4></div>
            <label className="sm:col-span-2 block"><span className="label">{isMe ? "Koop je alleen of samen?" : `Koopt ${first} alleen of samen?`}</span><select className="select" name="alleenOfSamen" defaultValue={p.data.eigendom?.alleenOfSamen ?? (a.mine.length > 1 ? "een_ander" : "alleen")}><option value="alleen">Alleen</option><option value="een_ander">Met één andere koper</option><option value="meerdere">Met meerdere kopers</option></select></label>
            <label className="sm:col-span-2 block"><span className="label">Eigendomsverhouding</span><select className="select" name="verhouding" defaultValue={p.data.eigendom?.verhouding ?? "gelijk"}><option value="gelijk">Gelijke delen</option><option value="anders">Andere verhouding</option><option value="nog_niet">Nog niet afgesproken</option></select></label>
            <label className="sm:col-span-2 block"><span className="label">{isMe ? "Jouw aandeel" : `Aandeel van ${first}`}</span><input className="input" name="aandeel" defaultValue={p.data.eigendom?.aandeel ?? (a.mine.length > 1 ? `1/${a.mine.length}` : "1/1")} placeholder="bijv. 1/2 of 60%" /></label>
            <label className="sm:col-span-3 block"><span className="label">{isMe ? "Koop je privé of via een onderneming?" : `Koopt ${first} privé of via een onderneming?`}</span><select className="select" name="priveOfOnderneming" defaultValue={p.data.eigendom?.privéOfOnderneming ?? "prive"}><option value="prive">Privé</option><option value="onderneming">Via een onderneming / rechtspersoon</option></select></label>
          </>
        )}
        {!isMe && !p.userId && (
          <label className="sm:col-span-6 block"><span className="label">E-mailadres van {first} (voor de persoonlijke stappen)</span><input className="input" name="email" type="email" defaultValue={p.email ?? ""} /></label>
        )}
        <div className="sm:col-span-6 flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-ink-500">{isMe ? "Door op te slaan bevestig je dat deze gegevens juist zijn." : `Door op te slaan bevestig je dat de gegevens van ${first} juist zijn.`}</p>
          <button className="btn btn-primary"><Check className="h-4 w-4" />Gegevens bevestigen</button>
        </div>
      </form>
      {!isMe && !p.userId && p.email && <InviteRow a={a} p={p} />}
    </Card>
  );
}

/** Uitnodiging aan een medekoper/-verkoper die nog geen account heeft. */
function InviteRow({ a, p }: { a: PartyAccess; p: Party }) {
  const first = p.data.person.roepnaam ?? p.data.person.voornamen?.split(" ")[0] ?? "Deze persoon";
  return (
    <form action={inviteCoParty.bind(null, a.view.dossier.id, p.id)} className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 p-4 text-sm">
      <input type="hidden" name="email" value={p.email ?? ""} />
      <span className="min-w-0 flex-1 text-ink-700">{p.invitedAt ? `Uitnodiging verstuurd aan ${p.email}.` : `${first} identificeert zich zelf en tekent een eigen volmacht. Stuur ${first} een uitnodiging (${p.email}).`}</span>
      <button className="btn btn-secondary btn-sm"><Send className="h-4 w-4" />{p.invitedAt ? "Opnieuw uitnodigen" : "Uitnodigen"}</button>
    </form>
  );
}

export function IdStep({ a }: { a: PartyAccess }) {
  return (
    <div className="space-y-5">
      {meFirst(a).map((p) => {
        const id = p.data.idcheck ?? { status: "te_starten" as const };
        const isMe = p.id === a.me.id;
        const first = p.data.person.roepnaam ?? p.displayName.split(" ")[0];
        return (
          <Card key={p.id} className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg text-ink-900"><StateIcon state={id.status === "voltooid" ? "done" : id.status === "in_behandeling" ? "in_progress" : "todo"} size="sm" />{p.displayName}{isMe && <span className="chip bg-ink-100 font-sans text-ink-600">jij</span>}</h3>
              <span className="shrink-0 text-sm font-medium text-ink-600">{id.status === "voltooid" ? "Voltooid" : id.status === "in_behandeling" ? "In behandeling" : "Nog te starten"}</span>
            </div>
            {id.status === "voltooid" && id.resultaat ? (
              <div className="mt-4 grid gap-2 rounded-xl bg-ok-50 p-4 text-sm sm:grid-cols-2">
                <p><span className="text-ink-500">Methode:</span> <strong>{id.provider ?? id.methode}</strong></p>
                <p><span className="text-ink-500">Voltooid:</span> <strong>{id.voltooidOp && id.voltooidOp.length > 10 ? dateTimeNl(id.voltooidOp) : dateNl(id.voltooidOp)}</strong></p>
                <p><span className="text-ink-500">Naam:</span> <strong>{id.resultaat.naam}</strong> {id.match?.naam && <BadgeCheck className="inline h-4 w-4 text-ok-600" />}</p>
                <p><span className="text-ink-500">Geboortedatum:</span> <strong>{dateNl(id.resultaat.geboortedatum)}</strong> {id.match?.geboortedatum && <BadgeCheck className="inline h-4 w-4 text-ok-600" />}</p>
              </div>
            ) : isMe ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href={`/portaal/${a.view.dossier.id}/idcheck?party=${p.id}&m=idin`} className="flex items-start gap-3 rounded-xl border-2 border-ink-100 p-4 hover:border-brand-400"><Landmark className="h-6 w-6 shrink-0 text-brand-600" /><span><span className="block font-semibold text-ink-900">Via je bank (iDIN)</span><span className="block text-sm text-ink-500">Log in bij je eigen bank. Klaar in 1 minuut.</span></span></Link>
                <Link href={`/portaal/${a.view.dossier.id}/idcheck?party=${p.id}&m=nfc_app`} className="flex items-start gap-3 rounded-xl border-2 border-ink-100 p-4 hover:border-brand-400"><Smartphone className="h-6 w-6 shrink-0 text-brand-600" /><span><span className="block font-semibold text-ink-900">Met je paspoort of ID-kaart</span><span className="block text-sm text-ink-500">De app leest de chip uit en maakt een selfie.</span></span></Link>
              </div>
            ) : p.userId ? (
              <p className="mt-3 text-sm text-ink-600">{first} identificeert zich via het eigen account. Je ziet hier wanneer dat is gelukt.</p>
            ) : p.email ? (
              <InviteRow a={a} p={p} />
            ) : (
              <p className="mt-3 text-sm text-ink-600">{first} moet zich zelf identificeren. Vul bij <Link href={`/portaal/${a.view.dossier.id}/stap/gegevens`} className="font-medium text-ink-900 underline underline-offset-2">Gegevens controleren</Link> het e-mailadres van {first} in, dan sturen we een uitnodiging.</p>
            )}
          </Card>
        );
      })}
      <p className="flex items-center gap-2 text-xs text-ink-500"><Fingerprint className="h-4 w-4 shrink-0" />Je hoeft geen kopie van je identiteitsbewijs te mailen. De identificatieprocedure wordt bepaald door de notaris.</p>
    </div>
  );
}

export function IbanStep({ a, error, draft }: { a: PartyAccess; error?: string; draft?: { iban?: string; tenaam?: string } }) {
  const cur = a.side === "koper" ? a.view.data.koperIban : a.me.data.iban ?? {};
  const names = a.mine.map((p) => personName(p.data.person)).join(" en ");
  return (
    <Card className="p-6">
      {error && <Notice tone="bad" className="mb-5" title="Dit IBAN klopt niet">{error}. Een Nederlands IBAN begint met NL, gevolgd door 2 cijfers, 4 letters (de bank) en 10 cijfers, bijvoorbeeld NL91 ABNA 0417 1643 00.</Notice>}
      <form action={saveIban.bind(null, a.view.dossier.id, null)} className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 block"><span className="label">{a.side === "koper" ? "Op welk IBAN mag de notaris een eventueel resterend bedrag na de overdracht aan je uitbetalen?" : "Op welk IBAN mag de notaris de netto verkoopopbrengst uitbetalen?"}</span><input className="input font-mono tracking-wide" name="iban" defaultValue={draft?.iban ?? formatIban(cur.iban)} placeholder="NL00 BANK 0123 4567 89" required aria-invalid={!!error} data-state={error ? "missing" : undefined} /></label>
        <label className="block"><span className="label">Naam rekeninghouder</span><input className="input" name="tenaamstelling" defaultValue={draft?.tenaam || cur.tenaamstelling || names} required /></label>
        {a.mine.length > 1 && <label className="block"><span className="label">{a.side === "koper" ? "Rekening voor de gezamenlijke afrekening" : "Afgesproken verdeling"}</span><input className="input" name="verdeling" defaultValue={cur.verdeling ?? (a.side === "koper" ? "Gezamenlijke rekening" : "Gezamenlijke rekening (50/50)")} /></label>}
        <label className="sm:col-span-2 flex cursor-pointer gap-3 rounded-xl bg-ink-50 p-4 text-sm"><input type="checkbox" name="bevestiging" defaultChecked={cur.bevestigd} required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" /><span className="text-ink-700">{a.side === "koper" ? "Ik bevestig dat de notaris een eventueel tegoed uit de nota van afrekening op dit IBAN mag overmaken." : "Ik bevestig dat de notaris de netto verkoopopbrengst op dit IBAN mag overmaken."} De rekening staat op naam van {a.side === "koper" ? "de koper(s)" : "de verkoper(s)"}.</span></label>
        <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary"><Check className="h-4 w-4" />IBAN vastleggen</button></div>
      </form>
      <p className="mt-4 text-xs text-ink-500">We controleren het formaat en registreren de rekeninghouder. Wijkt de tenaamstelling af, dan leggen we dat voor aan de notaris. De notaris controleert vóór uitbetaling of het rekeningnummer gebruikt mag worden.</p>
    </Card>
  );
}

/** Mijlpalen van de volmacht; een gevulde balk betekent "bereikt". */
const VM_STEPS = [["gepland", "Afspraak gepland"], ["ondertekend", "Ondertekend"], ["verwerkt", "Verwerkt door notaris"]] as const;
const VM_ORDER = ["te_plannen", "gepland", "ondertekend", "verwerkt"] as const;

export async function VolmachtStep({ a, error }: { a: PartyAccess; error?: string }) {
  const office = await getOffice();
  const taken = a.view.appointments.filter((x) => x.status === "gepland").map((x) => x.startsAt);
  const free = slots(office, taken, 8);
  const docId = a.side === "koper" ? a.view.data.volmachtKoperDocId : a.view.data.volmachtVerkoperDocId;
  const byDay = free.reduce<Record<string, Date[]>>((acc, s) => { const k = s.toISOString().slice(0, 10); (acc[k] ??= []).push(s); return acc; }, {});
  return (
    <div className="space-y-5" data-tour="volmacht-status">
      {error && <Notice tone="bad">{error}</Notice>}
      {docId && (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><FileSignature className="h-6 w-6 shrink-0 text-brand-600" /><div><p className="font-semibold text-ink-900">{a.side === "koper" ? (a.mine.every((p) => ["ondertekend", "verwerkt"].includes(p.data.volmacht?.status ?? "")) ? "Je volmacht is ondertekend" : "Je volmacht staat klaar") : "Je verkoopvolmacht staat klaar"}</p><p className="text-sm text-ink-600">{(() => {
            const signed = (p: Party) => ["ondertekend", "verwerkt"].includes(p.data.volmacht?.status ?? "");
            const open = a.mine.filter((p) => !signed(p)).map((p) => p.data.person.roepnaam ?? p.displayName.split(" ")[0]);
            if (signed(a.me)) return `Je hebt de volmacht ondertekend.${open.length ? ` ${open.join(" en ")} tekent nog.` : ""}`;
            return a.side === "koper" ? "Eén volmacht voor alle akten van je dossier. Lees hem rustig door; je tekent tijdens de afspraak." : "Een eenvoudige volmacht voor de levering, opgesteld door de notaris.";
          })()}</p></div></div>
          <Link href={`/portaal/${a.view.dossier.id}/document/${docId}`} className="btn btn-secondary btn-sm shrink-0"><Eye className="h-4 w-4" />Bekijk volmacht</Link>
        </Card>
      )}
      {meFirst(a).map((p) => {
        const v = p.data.volmacht ?? { status: "te_plannen" as const };
        const appt = a.view.appointments.find((x) => x.id === v.afspraakId);
        const idx = VM_ORDER.indexOf(v.status) - 1;
        const isMe = p.id === a.me.id;
        const first = p.data.person.roepnaam ?? p.displayName.split(" ")[0];
        return (
          <Card key={p.id} className="p-6">
            <h3 className="flex items-center gap-2 text-lg text-ink-900">{p.displayName}{isMe && <span className="chip bg-ink-100 font-sans text-ink-600">jij</span>}</h3>
            <ol className="mt-4 grid grid-cols-3 gap-2">
              {VM_STEPS.map(([k, l], i) => <li key={k} className="text-center"><div className={`mx-auto h-1.5 rounded-full ${i <= idx ? "bg-ok-600" : "bg-ink-100"}`} /><p className={`mt-2 text-xs font-medium ${i <= idx ? "text-ink-900" : "text-ink-400"}`}>{l}</p></li>)}
            </ol>
            {v.status === "te_plannen" && v.legalisatie !== "vereist" && (isMe ? (
              <form action={bookVolmacht.bind(null, a.view.dossier.id, p.id)} className="mt-6 space-y-4">
                <div><span className="label">Hoe wil je tekenen?</span><Radio name="mode" value="video" options={[["video", "Online via video (aanbevolen)"], ["kantoor", `Op kantoor in ${NOTARY_OFFICE.city}`]]} /></div>
                <div>
                  <span className="label">Kies een moment (± 15 minuten)</span>
                  <div className="max-h-72 space-y-3 overflow-auto rounded-xl border border-ink-100 p-3">
                    {Object.entries(byDay).slice(0, 6).map(([day, list]) => (
                      <div key={day}><p className="mb-1.5 text-xs font-semibold text-ink-500">{dateNl(day, { weekday: true })}</p><div className="flex flex-wrap gap-1.5">{list.slice(0, 10).map((s) => <label key={s.toISOString()} className="cursor-pointer"><input type="radio" name="slot" value={s.toISOString()} className="peer sr-only" required /><span className="inline-block rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm tabular peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white">{s.toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" })}</span></label>)}</div></div>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary"><CalendarCheck className="h-4 w-4" />Afspraak inplannen</button>
              </form>
            ) : <p className="mt-4 text-sm text-ink-600">{first} plant zelf een afspraak via {p.userId ? "het eigen account" : "de eigen uitnodiging"}.</p>)}
            {appt && v.status === "gepland" && (
              <div className="mt-5 flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm">
                {appt.mode === "video" ? <Video className="h-5 w-5 shrink-0 text-brand-600" /> : <Building2 className="h-5 w-5 shrink-0 text-brand-600" />}
                <div><p className="font-semibold text-ink-900">{isMe ? "Je afspraak: " : `Afspraak van ${first}: `}{appt.startsAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p><p className="text-ink-600">{appt.location}. {isMe ? "Neem je identiteitsbewijs mee (of houd het bij de hand)." : `${first} neemt een geldig identiteitsbewijs mee (of houdt het bij de hand).`}</p><a href={`/api/agenda/${appt.id}.ics`} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-700"><Download className="h-4 w-4" />Zet in je agenda</a></div>
              </div>
            )}
            {(v.status === "ondertekend" || v.status === "verwerkt") && <p className="mt-5 flex items-start gap-2 rounded-xl bg-ok-50 p-4 text-sm text-ok-700"><Check className="mt-0.5 h-4 w-4 shrink-0" />Ondertekend op {dateNl(v.ondertekendOp)}{v.ondertekeningMethode ? ` (${v.ondertekeningMethode})` : ""}{v.status === "verwerkt" ? ". De notaris heeft de volmacht geaccepteerd." : ". De notaris beoordeelt de volmacht."}</p>}
            {a.side === "verkoper" && v.status === "te_plannen" && isMe && (
              <div className="mt-5 rounded-xl border border-ink-100 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-ink-900"><Stamp className="h-4 w-4 text-notaris-600" />Liever zelf laten legaliseren?</p>
                {v.legalisatie === "vereist" ? (
                  <div className="mt-2 space-y-3 text-ink-600"><p>Print de volmacht, teken hem bij een notaris of de gemeente (legalisatie van je handtekening) en upload de scan. Stuur het origineel per post naar {NOTARY_OFFICE.address}.</p><div className="flex gap-2">{docId && <a href={`/api/documenten/${docId}`} className="btn btn-secondary btn-sm"><Download className="h-4 w-4" />Download volmacht</a>}<UploadButton dossierId={a.view.dossier.id} kind="volmacht_verkoper" extra={{ partyId: p.id }} label="Upload gelegaliseerde volmacht" variant="dark" /></div></div>
                ) : (
                  <form action={chooseLegalisatie.bind(null, a.view.dossier.id, p.id)} className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="text-ink-600">Bijvoorbeeld als je in het buitenland woont of geen video-afspraak wilt.</span><button className="btn btn-secondary btn-sm">Kies legalisatie</button></form>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
