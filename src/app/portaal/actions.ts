"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireParty } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { logEvent, updateDossier, updateParty } from "@/lib/domain/dossier";
import { runAutomations } from "@/lib/automation/engine";
import { startersUitkomst } from "@/lib/domain/calc";
import { normalizeIban, validateIban } from "@/lib/util/iban";
import { addDays, personName, todayIso } from "@/lib/util/format";
import { sha256, token, uid } from "@/lib/util/ids";
import { sendMail } from "@/lib/integrations/email";
import { siteUrl } from "@/lib/util/site";
import type { BurgerlijkeStaat, PersonData, WwftBron, WwftBronType } from "@/lib/domain/types";
import { NOTARY_OFFICE } from "@/lib/config";

const s = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined; };
const n = (fd: FormData, k: string) => { const v = s(fd, k); if (!v) return undefined; const x = Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")); return Number.isFinite(x) ? x : undefined; };

/** Na opslaan: automatisering draaien en terug naar het overzicht met een passende bevestiging. */
async function done(dossierId: string, back = true, wat = "1") {
  await runAutomations(dossierId, "portaal");
  revalidatePath(`/portaal/${dossierId}`, "layout");
  if (back) redirect(`/portaal/${dossierId}?opgeslagen=${wat}`);
}

function partyOf(a: Awaited<ReturnType<typeof requireParty>>, partyId: string) {
  const p = a.mine.find((x) => x.id === partyId);
  if (!p) throw new Error("Geen toegang tot deze persoon");
  return p;
}

// ---------- Gegevens (koper en verkoper) ----------
export async function saveGegevens(dossierId: string, partyId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  const person: PersonData = {
    ...p.data.person,
    voornamen: s(fd, "voornamen"), achternaam: s(fd, "achternaam"), geboortedatum: s(fd, "geboortedatum"), geboorteplaats: s(fd, "geboorteplaats"),
    nationaliteit: s(fd, "nationaliteit"), adres: s(fd, "adres"), postcode: s(fd, "postcode"), woonplaats: s(fd, "woonplaats"),
    burgerlijkeStaat: s(fd, "burgerlijkeStaat") as BurgerlijkeStaat | undefined,
    partnerNaam: s(fd, "partnerNaam"), partnerDatum: s(fd, "partnerDatum"),
    huwelijkseVoorwaarden: s(fd, "huwelijkseVoorwaarden") as PersonData["huwelijkseVoorwaarden"],
  };
  person.heeftPartner = person.burgerlijkeStaat === "gehuwd" || person.burgerlijkeStaat === "geregistreerd_partner" ? "ja" : "nee";
  const changed = Object.keys(person).filter((k) => (p.data.person as Record<string, unknown>)[k] !== (person as Record<string, unknown>)[k]);
  await updateParty(p.id, (d) => {
    d.person = person;
    d.eigendom = { ...(d.eigendom ?? {}), alleenOfSamen: (s(fd, "alleenOfSamen") as never) ?? d.eigendom?.alleenOfSamen, verhouding: (s(fd, "verhouding") as never) ?? d.eigendom?.verhouding, aandeel: s(fd, "aandeel") ?? d.eigendom?.aandeel, privéOfOnderneming: (s(fd, "priveOfOnderneming") as never) ?? d.eigendom?.privéOfOnderneming, bevestigd: true };
    d.gegevensBevestigd = true;
    d.gegevensBevestigdOp = new Date().toISOString();
    for (const k of changed) d.meta = { ...(d.meta ?? {}), [k]: { ...(d.meta?.[k] ?? { source: "klant" }), source: "klant", changedFrom: String((p.data.person as Record<string, unknown>)[k] ?? ""), confirmedBy: a.user.name, confirmedAt: new Date().toISOString() } };
    return { displayName: personName(person) || p.displayName, email: s(fd, "email") ?? p.email };
  });
  if (s(fd, "priveOfOnderneming") === "onderneming") await updateDossier(dossierId, (d) => { d.aandachtspunten.push({ id: uid(), tekst: `${personName(person)} koopt via een onderneming: zakelijke route beoordelen (niet volledig geautomatiseerd).`, ernst: "let_op", bron: "Klantopgave" }); });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "gegevens.bevestigd", message: `Persoonsgegevens ${personName(person)} bevestigd${changed.length ? ` (${changed.length} wijziging${changed.length > 1 ? "en" : ""} t.o.v. koopovereenkomst)` : ""}.`, visibleTo: a.side });
  await done(dossierId, true, "gegevens");
}

// ---------- Woning & financiering ----------
export async function saveWoning(dossierId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  await updateDossier(dossierId, (d) => {
    d.property.soort = (s(fd, "soort") as never) ?? d.property.soort;
    d.financing = {
      ...d.financing,
      hypotheek: (s(fd, "hypotheek") as never) ?? d.financing.hypotheek,
      geldverstrekker: s(fd, "geldverstrekker"),
      status: s(fd, "status") as never,
      overbrugging: s(fd, "overbrugging") as never,
      meerdereGeldverstrekkers: s(fd, "meerdere") as never,
      andereGeldverstrekkers: s(fd, "andere"),
      eigenMiddelen: s(fd, "eigenMiddelen") as never,
      hypotheekbedragIndicatie: n(fd, "hypotheekbedrag") ?? d.financing.hypotheekbedragIndicatie,
      adviseur: { naam: s(fd, "adviseurNaam"), kantoor: s(fd, "adviseurKantoor"), email: s(fd, "adviseurEmail") },
      bevestigd: true,
    };
    if (d.financing.hypotheek === "nee") d.financing.bankinstructieStatus = "nog_niet_verwacht";
    if (d.financing.eigenMiddelen === "nee") d.wwft.status = "niet_van_toepassing";
    if (d.financing.overbrugging === "ja" || d.financing.meerdereGeldverstrekkers === "ja") d.aandachtspunten.push({ id: uid(), tekst: d.financing.overbrugging === "ja" ? "Er is een overbruggingshypotheek: tweede hypotheekakte en instructie verwachten." : `Meerdere geldverstrekkers: ${d.financing.andereGeldverstrekkers ?? "onbekend"}.`, ernst: "let_op", bron: "Klantopgave" });
  });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "financiering", message: `Woning en financiering bevestigd (hypotheek: ${{ ja: "ja", nee: "nee", onbekend: "nog niet bekend" }[s(fd, "hypotheek") ?? ""] ?? "-"}${s(fd, "geldverstrekker") ? `, ${s(fd, "geldverstrekker")}` : ""}).`, visibleTo: "koper" });
  await done(dossierId, true, "woning");
}

// ---------- Startersvrijstelling ----------
export async function saveStarters(dossierId: string, partyId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  const next = { ...(p.data.starters ?? {}), hoofdverblijf: s(fd, "hoofdverblijf") as never, eerderGebruikt: s(fd, "eerderGebruikt") as never, wilGebruiken: s(fd, "wilGebruiken") as never };
  const uitkomst = startersUitkomst(next);
  await updateParty(p.id, (d) => { d.starters = { ...next, uitkomst, controlepunt: uitkomst === "controle_notaris" ? "Antwoorden startersvrijstelling onbekend/tegenstrijdig" : next.controlepunt }; });
  if (uitkomst === "controle_notaris") await updateDossier(dossierId, (d) => { d.aandachtspunten.push({ id: uid(), tekst: `Startersvrijstelling ${p.displayName}: onbekende of tegenstrijdige antwoorden, beoordeling door de notaris.`, ernst: "let_op", bron: "Startertoets" }); });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "starters.antwoord", message: `Startersvrijstelling ${p.displayName}: ${uitkomst === "vrijstelling" ? "komt mogelijk in aanmerking, verklaring klaargezet" : uitkomst ?? "beantwoord"}.`, visibleTo: "koper" });
  await done(dossierId, false);
  redirect(`/portaal/${dossierId}/stap/starters?opgeslagen=starters`);
}

export async function signStartersVerklaring(dossierId: string, partyId: string) {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  await updateParty(p.id, (d) => { d.starters = { ...(d.starters ?? {}), verklaringGetekendOp: new Date().toISOString() }; });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "starters.getekend", message: `Verklaring startersvrijstelling digitaal ondertekend door ${p.displayName}.`, visibleTo: "koper" });
  await done(dossierId, false);
  redirect(`/portaal/${dossierId}/stap/starters?opgeslagen=verklaring`);
}

// ---------- IBAN ----------
export async function saveIban(dossierId: string, partyId: string | null, fd: FormData) {
  const a = await requireParty(dossierId);
  const iban = normalizeIban(s(fd, "iban") ?? "");
  const v = validateIban(iban);
  if (!v.valid) redirect(`/portaal/${dossierId}/stap/iban?fout=${encodeURIComponent(v.reason ?? "Ongeldig IBAN")}&iban=${encodeURIComponent(s(fd, "iban") ?? "")}&tenaam=${encodeURIComponent(s(fd, "tenaamstelling") ?? "")}`);
  const tenaam = s(fd, "tenaamstelling") ?? "";
  const names = a.mine.map((p) => (p.data.person.achternaam ?? "").toLowerCase()).filter(Boolean);
  const derde = !names.some((nm) => tenaam.toLowerCase().includes(nm));
  const data = { iban, tenaamstelling: tenaam, bevestigd: s(fd, "bevestiging") === "on", bevestigdOp: new Date().toISOString(), derde, verdeling: s(fd, "verdeling") };
  if (a.side === "koper") await updateDossier(dossierId, (d) => { d.koperIban = data; if (derde) d.aandachtspunten.push({ id: uid(), tekst: `Uitbetalingsrekening koper t.n.v. "${tenaam}" lijkt niet op naam van de koper(s) te staan.`, ernst: "let_op", bron: "IBAN-controle" }); });
  else {
    const targets = partyId ? [partyOf(a, partyId)] : a.mine;
    for (const t of targets) await updateParty(t.id, (d) => { d.iban = data; });
    if (derde) await updateDossier(dossierId, (d) => { d.aandachtspunten.push({ id: uid(), tekst: `Uitbetalingsrekening verkoper t.n.v. "${tenaam}" lijkt niet op naam van de verkoper(s) te staan.`, ernst: "let_op", bron: "IBAN-controle" }); });
  }
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "iban", message: `Uitbetalingsrekening vastgelegd (${v.bank ?? "bank onbekend"})${derde ? ", mogelijk rekening van een derde" : ""}.`, visibleTo: a.side });
  await done(dossierId, true, "iban");
}

// ---------- Wwft ----------
export async function savePep(dossierId: string, partyId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  const antwoord = s(fd, "pep") as "ja" | "nee" | undefined;
  await updateParty(p.id, (d) => { d.pep = { antwoord, toelichting: s(fd, "toelichting"), beantwoordOp: new Date().toISOString() }; });
  if (antwoord === "ja") await updateDossier(dossierId, (d) => { d.aandachtspunten.push({ id: uid(), tekst: `${p.displayName} heeft aangegeven PEP te zijn (of familielid/naaste geassocieerde): aanvullende beoordeling notaris.`, ernst: "kritiek", bron: "Wwft-uitvraag" }); });
  await done(dossierId, false);
  redirect(`/portaal/${dossierId}/stap/wwft?opgeslagen=pep`);
}

export async function saveBron(dossierId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const id = s(fd, "id") ?? uid();
  const details: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("d_") && typeof v === "string" && v.trim()) details[k.slice(2)] = v.trim();
  const bron: WwftBron = { id, type: s(fd, "type") as WwftBronType, bedrag: n(fd, "bedrag"), beschikbaar: s(fd, "beschikbaar") as never, rekening: s(fd, "rekening") as never, eigenaarGeld: s(fd, "eigenaarGeld") as never, overgemaakt: s(fd, "overgemaakt") as never, details, documentIds: [] };
  await updateDossier(dossierId, (d) => {
    const i = d.wwft.bronnen.findIndex((b) => b.id === id);
    if (i >= 0) d.wwft.bronnen[i] = { ...bron, documentIds: d.wwft.bronnen[i].documentIds };
    else d.wwft.bronnen.push(bron);
    d.wwft.status = d.wwft.status === "aanvullende_stukken_nodig" ? d.wwft.status : "uitvraag_open";
    d.wwft.ingediendOp = undefined;
  });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "wwft.bron", message: `Geldbron "${bron.type}" vastgelegd (${bron.bedrag ? `€ ${bron.bedrag.toLocaleString("nl-NL")}` : "bedrag onbekend"}).` });
  revalidatePath(`/portaal/${dossierId}/stap/wwft`);
  redirect(`/portaal/${dossierId}/stap/wwft?opgeslagen=bron#bron-${id}`);
}

export async function deleteBron(dossierId: string, bronId: string) {
  await requireParty(dossierId);
  await updateDossier(dossierId, (d) => { d.wwft.bronnen = d.wwft.bronnen.filter((b) => b.id !== bronId); d.wwft.ingediendOp = undefined; });
  revalidatePath(`/portaal/${dossierId}/stap/wwft`);
  redirect(`/portaal/${dossierId}/stap/wwft`);
}

export async function submitWwft(dossierId: string) {
  const a = await requireParty(dossierId);
  await updateDossier(dossierId, (d) => { d.wwft.ingediendOp = new Date().toISOString(); d.wwft.status = "aangeleverd"; });
  const db = await getDb();
  for (const r of a.view.requests.filter((r) => r.checkKey === "wwft_id" && r.status === "open" && r.side === "koper")) await db.update(schema.requests).set({ status: "beantwoord", answeredAt: new Date(), response: "Aanvullende Wwft-informatie aangeleverd" }).where(eq(schema.requests.id, r.id));
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "wwft.ingediend", message: "Wwft-informatie aangeleverd (herkomst eigen middelen, met bewijsstukken).", visibleTo: "koper" });
  await done(dossierId, true, "wwft");
}

// ---------- Identificatie (gesimuleerde provider in demo) ----------
export async function completeIdCheck(dossierId: string, partyId: string, methode: "idin" | "nfc_app") {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  const person = p.data.person;
  await updateParty(p.id, (d) => {
    d.idcheck = {
      status: "voltooid", methode, provider: methode === "idin" ? "iDIN (gesimuleerd)" : "ID-app met NFC (gesimuleerd)", gestartOp: new Date().toISOString(), voltooidOp: new Date().toISOString(),
      resultaat: { naam: personName(person), geboortedatum: person.geboortedatum ?? "", documentType: methode === "idin" ? "iDIN-bankidentificatie" : "Paspoort", documentNummerMasked: methode === "idin" ? undefined : "NX•••••" + Math.floor(Math.random() * 9) + "K", bank: methode === "idin" ? "Demo-bank" : undefined },
      match: { naam: true, geboortedatum: true },
    };
  });
  await logEvent({ dossierId, actorType: "systeem", type: "idcheck.voltooid", message: `Identificatie ${p.displayName} voltooid via ${methode === "idin" ? "iDIN" : "ID-app (NFC-chip)"}; gegevens komen overeen met de koopovereenkomst.`, visibleTo: a.side });
  await done(dossierId, true, "id");
}

// ---------- Volmacht ----------
export async function bookVolmacht(dossierId: string, partyId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  const startsAt = new Date(s(fd, "slot") ?? "");
  const mode = (s(fd, "mode") ?? "video") as "video" | "kantoor";
  if (Number.isNaN(startsAt.getTime())) redirect(`/portaal/${dossierId}/stap/volmacht?fout=Kies%20een%20moment`);
  const db = await getDb();
  const id = uid();
  await db.insert(schema.appointments).values({ id, dossierId, partyId: p.id, kind: "volmacht", mode, startsAt, location: mode === "video" ? "Videogesprek (beveiligde link volgt per e-mail)" : NOTARY_OFFICE.address });
  await updateParty(p.id, (d) => { d.volmacht = { ...(d.volmacht ?? { status: "te_plannen" }), status: "gepland", afspraakId: id }; });
  if (p.email) await sendMail({ to: p.email, dossierId, template: "volmacht.afspraak", subject: "Bevestiging volmachtafspraak", heading: "Je volmachtafspraak staat gepland", intro: `${startsAt.toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}, ${mode === "video" ? "via een beveiligd videogesprek. Je ontvangt de link een dag van tevoren" : `op kantoor (${NOTARY_OFFICE.address})`}.`, paragraphs: ["Neem je paspoort of identiteitskaart mee (of houd het bij de hand). De afspraak duurt ongeveer 15 minuten. Je tekent één volmacht voor alle akten van je dossier."] });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "volmacht.gepland", message: `Volmachtafspraak ${p.displayName} gepland (${mode}).`, visibleTo: a.side });
  await done(dossierId, false);
  redirect(`/portaal/${dossierId}/stap/volmacht?opgeslagen=afspraak`);
}

export async function chooseLegalisatie(dossierId: string, partyId: string) {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  await updateParty(p.id, (d) => { d.volmacht = { ...(d.volmacht ?? { status: "te_plannen" }), legalisatie: "vereist" }; });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "volmacht.legalisatie", message: `${p.displayName} kiest voor ondertekening met legalisatie van de handtekening.`, visibleTo: "verkoper" });
  revalidatePath(`/portaal/${dossierId}/stap/volmacht`);
  redirect(`/portaal/${dossierId}/stap/volmacht`);
}

// ---------- Verkoper: zekerheden ----------
export async function saveZekerheden(dossierId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  if (a.side !== "verkoper") throw new Error("Alleen voor verkopers");
  const db = await getDb();
  const geen = s(fd, "geen") === "on";
  for (const p of a.view.payoffs) {
    await db.update(schema.payoffs).set({ loanNumbers: s(fd, `lening_${p.id}`) ?? p.loanNumbers, toestemmingVerkoper: s(fd, "toestemming") === "on" }).where(eq(schema.payoffs.id, p.id));
  }
  const extra = s(fd, "extraLender");
  if (extra) await db.insert(schema.payoffs).values({ id: uid(), dossierId, lender: extra, loanNumbers: s(fd, "extraLening") ?? null, source: "verkoper", toestemmingVerkoper: s(fd, "toestemming") === "on", doorhalingKosten: 9500 });
  for (const p of a.mine) await updateParty(p.id, (d) => { d.meta = { ...(d.meta ?? {}), zekerhedenBevestigd: { source: "klant", confirmedBy: a.user.name, confirmedAt: new Date().toISOString() } }; });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "zekerheden", message: geen && !a.view.payoffs.length ? "Verkoper bevestigt: geen af te lossen hypotheken." : `Verkoper bevestigt bestaande hypotheek/hypotheken en geeft toestemming aflosnota op te vragen.`, visibleTo: "verkoper" });
  await done(dossierId, true, "zekerheden");
}

// ---------- Datumcheck ----------
export async function answerDatumCheck(dossierId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const antwoord = s(fd, "antwoord") as "ja" | "nee_nieuwe_datum" | "onbekend";
  const nieuwe = s(fd, "nieuweDatum");
  await updateDossier(dossierId, (d) => {
    d.datumCheck = { ...d.datumCheck, antwoord, nieuweDatum: nieuwe, beantwoordOp: new Date().toISOString(), gevraagdOp: d.datumCheck.gevraagdOp ?? new Date().toISOString() };
    if (antwoord === "ja") d.transaction.leveringsdatumStatus = "bevestigd";
    if (antwoord === "nee_nieuwe_datum" && nieuwe) {
      d.transaction.leveringsdatumHistorie = [...(d.transaction.leveringsdatumHistorie ?? []), { datum: d.transaction.leveringsdatum ?? "", gewijzigdOp: new Date().toISOString(), door: a.user.name }];
      d.transaction.leveringsdatum = nieuwe;
      d.transaction.leveringsdatumStatus = "gewijzigd";
      d.aandachtspunten.push({ id: uid(), tekst: `Nieuwe leveringsdatum opgegeven door koper: ${nieuwe} (oorspronkelijk ${d.transaction.leveringsdatumOrigineel}). Geldverstrekker en verkoper informeren.`, ernst: "let_op", bron: "Datumcontrole" });
    }
    if (antwoord === "onbekend") { d.transaction.leveringsdatumStatus = "nog_te_bepalen"; d.datumCheck.gevraagdOp = addDays(todayIso(), 0); }
  });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "datum.antwoord", message: antwoord === "ja" ? "Overdrachtsdatum bevestigd." : antwoord === "nee_nieuwe_datum" ? `Nieuwe overdrachtsdatum doorgegeven: ${nieuwe}.` : "Nieuwe datum nog niet bekend, later opnieuw controleren.", visibleTo: "partijen" });
  await done(dossierId, true, "datum");
}

// ---------- Mede-partij uitnodigen ----------
export async function inviteCoParty(dossierId: string, partyId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const p = partyOf(a, partyId);
  const email = s(fd, "email");
  if (!email) redirect(`/portaal/${dossierId}?fout=E-mailadres%20ontbreekt`);
  const t = token(24);
  await getDb().then((db) => db.update(schema.parties).set({ email, inviteToken: sha256(t), invitedAt: new Date() }).where(eq(schema.parties.id, p.id)));
  await sendMail({ to: email, dossierId, template: "medepartij.uitnodiging", subject: `${a.user.name} nodigt je uit voor jullie notarisdossier`, heading: `Hallo ${p.data.person.roepnaam ?? p.data.person.voornamen?.split(" ")[0] ?? ""},`, intro: `${a.user.name} heeft je uitgenodigd om je persoonlijke stappen af te ronden voor de overdracht van ${a.view.data.property.straat} ${a.view.data.property.huisnummer}.`, paragraphs: ["Je identificeert je digitaal en tekent je eigen volmacht. Het kost je een paar minuten."], cta: { label: "Naar het portaal", href: `${siteUrl()}/uitnodiging/${t}` } });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "medepartij.uitgenodigd", message: `${p.displayName} uitgenodigd voor de persoonlijke stappen.`, visibleTo: a.side });
  revalidatePath(`/portaal/${dossierId}`);
  redirect(`/portaal/${dossierId}?uitgenodigd=1`);
}

// ---------- Aanvullingsverzoek beantwoorden ----------
export async function answerRequest(dossierId: string, requestId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const r = a.view.requests.find((x) => x.id === requestId && x.side === a.side);
  if (!r) throw new Error("Verzoek niet gevonden");
  const db = await getDb();
  await db.update(schema.requests).set({ status: "beantwoord", response: s(fd, "response") ?? "Document aangeleverd", answeredAt: new Date() }).where(eq(schema.requests.id, requestId));
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "verzoek.beantwoord", message: `Aanvullingsverzoek "${r.title}" beantwoord.`, visibleTo: a.side });
  await done(dossierId, true, "verzoek");
}

export async function approveNota(dossierId: string) {
  const a = await requireParty(dossierId);
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: `nota.${a.side}.akkoord`, message: `${a.user.name} heeft de nota van afrekening (${a.side}) gezien en akkoord bevonden.`, visibleTo: a.side });
  for (const p of a.mine) await updateParty(p.id, (d) => { d.meta = { ...(d.meta ?? {}), notaAkkoord: { source: "klant", confirmedBy: a.user.name, confirmedAt: new Date().toISOString() } }; });
  await done(dossierId, true, "nota");
}
