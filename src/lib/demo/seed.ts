import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DEMO, demoDates } from "./scenario";
import { aflosnotaPdf, bankafschriftPdf, bankinstructiePdf, genericKoPdf, koopovereenkomstPdf, schenkingPdf } from "./pdfs";
import { attachKoopovereenkomst, createConceptDossier, finalizeAanvraag } from "@/lib/domain/intake";
import { emptyPartyData, loadDossierView, logEvent, updateDossier, updateParty } from "@/lib/domain/dossier";
import { runAutomations } from "@/lib/automation/engine";
import { saveDocument } from "@/lib/integrations/storage";
import { scanBankinstructie } from "@/lib/extraction/bankinstructie";
import { DEFAULT_OFFICE, DEFAULT_WWFT_MATRIX } from "@/lib/domain/settings";
import { token, uid } from "@/lib/util/ids";
import { addDays, todayIso } from "@/lib/util/format";
import type { Role } from "@/lib/domain/types";
import { PERSONAS } from "./personas";
import { DVO_VERSION } from "@/lib/config";
export { PERSONAS };

export async function ensureBaseSettings() {
  const db = await getDb();
  const have = new Set((await db.select({ key: schema.settings.key }).from(schema.settings)).map((r) => r.key));
  if (!have.has("wwft_matrix")) await db.insert(schema.settings).values({ key: "wwft_matrix", value: DEFAULT_WWFT_MATRIX });
  if (!have.has("office")) await db.insert(schema.settings).values({ key: "office", value: DEFAULT_OFFICE });
  // Medewerkers (productie): via env, komma-gescheiden.
  const staff: [string | undefined, Role][] = [[process.env.STAFF_NOTARY_EMAILS, "notaris"], [process.env.STAFF_OPS_EMAILS, "beheer"]];
  for (const [list, role] of staff) {
    for (const email of (list ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)) {
      const ex = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (!ex.length) await db.insert(schema.users).values({ id: uid(), email, name: email.split("@")[0], role, emailVerifiedAt: new Date() });
    }
  }
}

export async function ensureDemoSeed() {
  const db = await getDb();
  const any = await db.select({ id: schema.dossiers.id }).from(schema.dossiers).limit(1);
  await ensureBaseSettings();
  if (any.length) return;
  // Claim: op serverless kunnen meerdere instances tegelijk starten — maar één mag seeden.
  const claimed = await db.insert(schema.settings).values({ key: "demo_seed", value: { status: "bezig", op: new Date().toISOString() } }).onConflictDoNothing().returning({ key: schema.settings.key });
  if (!claimed.length) return;
  try {
    await seedDemo();
    await db.update(schema.settings).set({ value: { status: "klaar", op: new Date().toISOString() } }).where(eq(schema.settings.key, "demo_seed"));
  } catch (e) {
    await db.delete(schema.settings).where(eq(schema.settings.key, "demo_seed"));
    throw e;
  }
}

export async function resetDemo() {
  const db = await getDb();
  for (const t of [schema.events, schema.emails, schema.handovers, schema.payoffs, schema.appointments, schema.requests, schema.checks, schema.documents, schema.parties, schema.dossiers, schema.sessions, schema.loginTokens, schema.users, schema.settings]) {
    await db.delete(t);
  }
  await ensureBaseSettings();
  await seedDemo();
}

async function user(email: string, name: string, role: Role) {
  const db = await getDb();
  const ex = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (ex[0]) return ex[0];
  const [u] = await db.insert(schema.users).values({ id: uid(), email, name, role, emailVerifiedAt: new Date() }).returning();
  return u;
}

async function seedDemo() {
  const t0 = Date.now();
  const users = Object.fromEntries(await Promise.all(PERSONAS.map(async (p) => [p.key, await user(p.email, p.name, p.role)] as const)));
  await user(DEMO.verkopers[1].email, "Marijke Visser", "klant");
  await seedMain(users);
  await seedPipeline();
  console.log(`[demo] seed klaar in ${Date.now() - t0} ms`);
}

async function seedMain(users: Record<string, { id: string; name: string }>) {
  const db = await getDb();
  const dd = demoDates();
  const id = await createConceptDossier("beide", token(), true);
  await db.update(schema.dossiers).set({ reference: DEMO.reference }).where(eq(schema.dossiers.id, id));
  await attachKoopovereenkomst(id, { buf: await koopovereenkomstPdf(), filename: "koopovereenkomst-bloesemlaan-14.pdf", mime: "application/pdf" });
  await finalizeAanvraag(id, { name: "Sanne Marieke de Vries", email: DEMO.kopers[0].email, phone: DEMO.kopers[0].phone, rol: "koper", signatureName: "Sanne Marieke de Vries", checks: ["dvo", "voorwaarden", "volmacht", "juist"], ip: "203.0.113.24", userAgent: "Mozilla/5.0 (demo)", hasKo: true });

  let view = (await loadDossierView(id))!;
  const [sanne, daan] = view.kopers;
  const [henk, marijke] = view.verkopers;
  const marijkeUser = (await db.select().from(schema.users).where(eq(schema.users.email, DEMO.verkopers[1].email)))[0];

  await updateDossier(id, (d) => {
    d.property = { ...d.property, bouwjaar: DEMO.property.bouwjaar, oppervlakte: DEMO.property.oppervlakte, bagId: DEMO.property.bagId, wozWaarde: DEMO.property.wozWaarde };
    d.transaction.ozbJaarbedrag = DEMO.ozbJaar;
    d.transaction.waterschapJaarbedrag = DEMO.waterschapJaar;
    d.transaction.waarborgsom = { ...d.transaction.waarborgsom, ontvangen: true };
    d.koStatus = "verwerkt";
    d.financing = { ...d.financing, hypotheek: "ja", geldverstrekker: "Noorderlicht Hypotheken N.V. (fictief)", status: "rond", overbrugging: "nee", meerdereGeldverstrekkers: "nee", eigenMiddelen: "ja", hypotheekbedragIndicatie: DEMO.financieringBedrag, adviseur: DEMO.adviseur, bevestigd: true, bankinstructieStatus: "verwacht" };
    d.koperIban = { iban: "NL91ABNA0417164300", tenaamstelling: "S.M. de Vries en D.P. Bakker", bevestigd: true, bevestigdOp: daysAgo(24, 20) };
    d.wwft = { bronnen: [], status: "aangeleverd" };
    if (d.dvo) d.dvo.acceptedAt = new Date(Date.now() - 33 * 86400_000).toISOString();
  });

  const koperExtra = [DEMO.kopers[0], DEMO.kopers[1]];
  for (const [i, k] of [sanne, daan].entries()) {
    const x = koperExtra[i];
    await updateParty(k.id, (d) => {
      d.person = { ...d.person, nationaliteit: x.nationaliteit, roepnaam: x.roepnaam, beroep: x.beroep, huwelijkseVoorwaarden: "nee", heeftPartner: "nee" };
      d.eigendom = { alleenOfSamen: "een_ander", verhouding: "gelijk", aandeel: "1/2", privéOfOnderneming: "prive", bevestigd: true };
      d.gegevensBevestigd = true;
      d.gegevensBevestigdOp = daysAgo(26, 10 + i);
      d.pep = { antwoord: "nee", beantwoordOp: daysAgo(16, 9 + i) };
      d.idcheck = { status: "voltooid", methode: "idin", provider: "iDIN (demo)", gestartOp: addDays(todayIso(), -20), voltooidOp: addDays(todayIso(), -20), resultaat: { naam: `${x.voornamen} ${x.achternaam}`, geboortedatum: x.geboortedatum, documentType: "Paspoort", documentNummerMasked: "NX•••••7K", geldigTot: "2031-04-11", bank: i === 0 ? "ING (demo)" : "Rabobank (demo)" }, match: { naam: true, geboortedatum: true } };
    }, );
    if (i === 0) await db.update(schema.parties).set({ phone: x.phone }).where(eq(schema.parties.id, k.id));
    else await db.update(schema.parties).set({ userId: users.medekoper.id, email: x.email, phone: x.phone, activatedAt: new Date() }).where(eq(schema.parties.id, k.id));
  }
  // Startersvrijstelling: Sanne (29) wel, Daan (36) niet
  await runAutomations(id, "seed");
  await updateParty(sanne.id, (d) => { d.starters = { ...d.starters, hoofdverblijf: "ja", eerderGebruikt: "nee", wilGebruiken: "ja", uitkomst: "vrijstelling" }; });
  await updateParty(daan.id, (d) => { d.starters = { ...d.starters, hoofdverblijf: "ja", uitkomst: "2%" }; });
  await runAutomations(id, "seed");
  view = (await loadDossierView(id))!;
  await updateParty(sanne.id, (d) => { d.starters = { ...d.starters, verklaringGetekendOp: addDays(todayIso(), -12) }; });

  // Wwft: twee bronnen met bewijsstukken
  // documentType = de stukken uit de documentregels van de notaris, zodat de checklist per bron klopt.
  const afschrift = await saveDocument({ dossierId: id, partyId: sanne.id, kind: "wwft_bewijs", title: "Rekeningafschrift spaarrekening", filename: "spaarrekening-afschrift.pdf", mime: "application/pdf", content: await bankafschriftPdf(), source: "upload", visibility: "koper", meta: { bron: "spaargeld", documentType: "Rekeningafschrift(en) waarop saldo en rekeninghouder zichtbaar zijn" } });
  const schenking = await saveDocument({ dossierId: id, partyId: sanne.id, kind: "wwft_bewijs", title: "Schenkingsovereenkomst ouders", filename: "schenkingsovereenkomst.pdf", mime: "application/pdf", content: await schenkingPdf(), source: "upload", visibility: "koper", meta: { bron: "schenking", documentType: "Schenkingsovereenkomst of schriftelijke verklaring" } });
  const ontvangst = await saveDocument({ dossierId: id, partyId: sanne.id, kind: "wwft_bewijs", title: "Rekeningafschrift ontvangst schenking", filename: "afschrift-ontvangst-schenking.pdf", mime: "application/pdf", content: await bankafschriftPdf(), source: "upload", visibility: "koper", meta: { bron: "schenking", documentType: "Bewijs van ontvangst (rekeningafschrift)" } });
  await updateDossier(id, (d) => {
    d.wwft = {
      status: "aangeleverd",
      ingediendOp: amsAt(addDays(todayIso(), -15), 10, 12).toISOString(),
      bronnen: [
        { id: uid(), type: "spaargeld", bedrag: 35000, beschikbaar: "helemaal", rekening: "gezamenlijk", eigenaarGeld: "mij_en_partner", overgemaakt: "ja", details: { opbouw: "Loon of regulier inkomen" }, documentIds: [afschrift] },
        { id: uid(), type: "schenking", bedrag: 25000, beschikbaar: "helemaal", rekening: "eigen", eigenaarGeld: "mij", overgemaakt: "ja", details: { van: "Ouders", relatie: "Ouders van Sanne (A. de Vries en J. de Vries-Mulder)", ontvangen: "ja", voorwaarden: "nee" }, documentIds: [schenking, ontvangst] },
      ],
    };
  });

  // Volmachtafspraken: Sanne getekend (video), Daan gepland
  const past = amsAt(addDays(todayIso(), -4), 10, 30);
  const future = amsAt(workday(addDays(todayIso(), 2)), 16, 0);
  const a1 = uid(); const a2 = uid();
  await db.insert(schema.appointments).values([
    { id: a1, dossierId: id, partyId: sanne.id, kind: "volmacht", mode: "video", startsAt: past, status: "afgerond", location: "Videogesprek (beveiligde link)" },
    { id: a2, dossierId: id, partyId: daan.id, kind: "volmacht", mode: "kantoor", startsAt: future, status: "gepland", location: "Stationsplein 8, Amersfoort" },
  ]);
  await updateParty(sanne.id, (d) => { d.volmacht = { status: "ondertekend", afspraakId: a1, ondertekendOp: past.toISOString(), ondertekeningMethode: "video" }; });
  await updateParty(daan.id, (d) => { d.volmacht = { status: "gepland", afspraakId: a2 }; });

  // Verkopers: geactiveerd en grotendeels afgerond
  const vkExtra = [DEMO.verkopers[0], DEMO.verkopers[1]];
  for (const [i, v] of [henk, marijke].entries()) {
    const x = vkExtra[i];
    await db.update(schema.parties).set({ userId: i === 0 ? users.verkoper.id : marijkeUser.id, email: x.email, phone: x.phone, invitedAt: new Date(Date.now() - 30 * 86400_000), activatedAt: new Date(Date.now() - 29 * 86400_000) }).where(eq(schema.parties.id, v.id));
    await updateParty(v.id, (d) => {
      d.person = { ...d.person, nationaliteit: x.nationaliteit, roepnaam: x.roepnaam, huwelijkseVoorwaarden: "nee", heeftPartner: "ja", partnerDatum: x.partnerDatum };
      d.eigendom = { alleenOfSamen: "een_ander", aandeel: "1/2", bevestigd: true };
      d.gegevensBevestigd = true;
      d.gegevensBevestigdOp = daysAgo(28, 19 + i);
      d.idcheck = { status: "voltooid", methode: i === 0 ? "idin" : "nfc_app", provider: i === 0 ? "iDIN (demo)" : "ID-app met NFC-chip (demo)", voltooidOp: addDays(todayIso(), -25), resultaat: { naam: `${x.voornamen} ${x.achternaam}`, geboortedatum: x.geboortedatum, documentType: i === 0 ? "Identiteitskaart" : "Paspoort", documentNummerMasked: i === 0 ? "IR•••••3D" : "NP•••••9Q", geldigTot: "2030-02-01" }, match: { naam: true, geboortedatum: true } };
      d.iban = { iban: "NL20INGB0001234567", tenaamstelling: "H.J. Jansen en M.E. Visser", bevestigd: true, bevestigdOp: daysAgo(27, 20), verdeling: "Gezamenlijke rekening (beide 50%)" };
      d.meta = { ...(d.meta ?? {}), zekerhedenBevestigd: { source: "klant", confirmedAt: daysAgo(27, 20) } };
    });
  }
  await db.update(schema.users).set({ name: "Marijke Visser" }).where(eq(schema.users.id, marijkeUser.id));
  await runAutomations(id, "seed");
  // Verkoper-volmachten getekend
  for (const v of [henk, marijke]) await updateParty(v.id, (d) => { d.volmacht = { ...(d.volmacht ?? { status: "te_plannen" }), status: "ondertekend", ondertekendOp: amsAt(addDays(todayIso(), -9), 14, 0).toISOString(), ondertekeningMethode: "video", legalisatie: "niet_vereist", ontvangenOp: amsAt(addDays(todayIso(), -9), 14, 5).toISOString() }; });

  // Aflosnota Westbank: toestemming → verzoek → ontvangen
  view = (await loadDossierView(id))!;
  const po = view.payoffs[0];
  if (po) {
    await db.update(schema.payoffs).set({ loanNumbers: DEMO.aflosnota.leningnummer, toestemmingVerkoper: true, source: "kadaster" }).where(eq(schema.payoffs.id, po.id));
    await runAutomations(id, "seed");
    const aflos = await saveDocument({ dossierId: id, kind: "aflosnota", filename: "aflosnota-westbank.pdf", mime: "application/pdf", content: await aflosnotaPdf(), source: "geldverstrekker", visibility: "intern", meta: { lender: po.lender } });
    await db.update(schema.payoffs).set({ status: "ontvangen", amount: Math.round(DEMO.aflosnota.bedrag * 100), validUntil: dd.levering, documentId: aflos, requestedAt: new Date(Date.now() - 8 * 86400_000), receivedAt: new Date(Date.now() - 3 * 86400_000) }).where(eq(schema.payoffs.id, po.id));
  }

  // Bankinstructie ontvangen (via notaris gedeeld) → concept-hypotheekakte
  const biPdf = await bankinstructiePdf();
  const biDoc = await saveDocument({ dossierId: id, kind: "bankinstructie", filename: "hypotheekinstructie-noorderlicht.pdf", mime: "application/pdf", content: biPdf, source: "notaris", visibility: "intern", meta: { gedeeldDoor: "notaris" } });
  const bi = await scanBankinstructie(biPdf);
  await updateDossier(id, (d) => { d.financing.bankinstructie = { ...bi.data, ontvangenOp: daysAgo(5, 11), documentId: biDoc }; d.financing.bankinstructieStatus = "ontvangen"; });
  await runAutomations(id, "seed");

  // Notaris heeft N1 al akkoord gegeven; de rest staat open voor de demo
  const n1 = (await db.select().from(schema.checks).where(eq(schema.checks.dossierId, id))).find((c) => c.key === "wwft_id");
  if (n1) await db.update(schema.checks).set({ status: "akkoord", decidedBy: "Lotte van Dam", decidedAt: new Date(Date.now() - 86400_000), comment: "ID's en Wwft-stukken gecontroleerd. Schenking ouders voldoende onderbouwd." }).where(eq(schema.checks.id, n1.id));
  await logEvent({ dossierId: id, actorType: "notaris", actorName: "Lotte van Dam", type: "check.akkoord", message: "N1 Wwft-uitvraag en identificatie: akkoord." });

  await spreadTimeline(id, 33);
  await alignWithTimeline(id);
}

/** ISO-tijdstip `days` dagen geleden om `hour` uur (Nederlandse tijd bij benadering). */
function daysAgo(days: number, hour = 10): string {
  return amsAt(addDays(todayIso(), -days), hour, (days * 7) % 60).toISOString();
}

/** Minuten dat Europe/Amsterdam op moment `d` voorloopt op UTC (60 of 120). */
function amsOffset(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Amsterdam", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d);
  const get = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
  return Math.round((Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - d.getTime()) / 60000);
}

/** Tijdstip "YYYY-MM-DD HH:mm" als Nederlandse kloktijd (Europe/Amsterdam), ongeacht de servertijdzone. */
function amsAt(dateIso: string, hour: number, minute = 0): Date {
  const guess = new Date(`${dateIso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);
  const first = new Date(guess.getTime() - amsOffset(guess) * 60000);
  return new Date(guess.getTime() - amsOffset(first) * 60000);
}

/** Uur van de dag in Nederlandse tijd. */
const amsHour = (d: Date) => (d.getUTCHours() + Math.round(amsOffset(d) / 60)) % 24;

/** Eerstvolgende werkdag (passeren gebeurt niet in het weekend). */
function workday(iso: string): string {
  let d = iso;
  for (let i = 0; i < 3; i++) { const wd = new Date(d + "T12:00:00Z").getUTCDay(); if (wd !== 0 && wd !== 6) break; d = addDays(d, 1); }
  return d;
}

/**
 * Laat vastgelegde datums (DVO-akkoord, besluit N1, documentdatums) samenvallen met de
 * bijbehorende gebeurtenis op de tijdlijn, zodat portaal en notarisscherm hetzelfde zeggen.
 */
async function alignWithTimeline(dossierId: string) {
  const db = await getDb();
  const evs = await db.select().from(schema.events).where(eq(schema.events.dossierId, dossierId)).orderBy(asc(schema.events.createdAt));
  const at = (type: string, last = false) => { const list = evs.filter((e) => e.type === type); return (last ? list[list.length - 1] : list[0])?.createdAt; };
  const dvo = at("dvo.akkoord");
  if (dvo) await updateDossier(dossierId, (d) => { if (d.dvo) d.dvo.acceptedAt = dvo.toISOString(); });
  const n1 = at("check.akkoord", true);
  if (n1) await db.update(schema.checks).set({ decidedAt: n1 }).where(and(eq(schema.checks.dossierId, dossierId), eq(schema.checks.key, "wwft_id"), eq(schema.checks.status, "akkoord")));
  const kindToEvent: Record<string, string> = {
    koopovereenkomst: "ko.uitgelezen", dvo: "dvo.akkoord", kadaster_eigendom: "kadaster.opgehaald", kadaster_kaart: "kadaster.opgehaald", kadaster_akte: "kadaster.opgehaald",
    volmacht_koper: "volmacht.koper", volmacht_verkoper: "volmacht.verkoper", verklaring_starters: "starters.verklaring", concept_leveringsakte: "akte.levering",
    concept_hypotheekakte: "akte.hypotheek", bankinstructie: "akte.hypotheek", aflosnota_verzoek: "aflosnota.voorbereid", wwft_bewijs: "wwft.ingediend",
  };
  const [dossier] = await db.select().from(schema.dossiers).where(eq(schema.dossiers.id, dossierId));
  const ingediend = dossier.data.wwft?.ingediendOp ? new Date(dossier.data.wwft.ingediendOp) : undefined;
  const docs = await db.select().from(schema.documents).where(eq(schema.documents.dossierId, dossierId));
  for (const doc of docs) {
    let t = kindToEvent[doc.kind] ? at(kindToEvent[doc.kind], doc.kind.startsWith("concept_")) : undefined;
    if (!t && doc.kind === "wwft_bewijs" && ingediend) t = ingediend;
    if (!t) t = evs[0]?.createdAt ?? dossier.createdAt;
    await db.update(schema.documents).set({ createdAt: new Date(t.getTime() - (doc.kind === "wwft_bewijs" || doc.kind === "bankinstructie" ? 3600_000 : 0)) }).where(eq(schema.documents.id, doc.id));
  }
  // De datumcontrole gaat precies 14 dagen vóór de levering uit — niet ergens op de tijdlijn.
  const lev = dossier.data.transaction.leveringsdatum;
  const dc = evs.find((e) => e.type === "datum.gevraagd");
  if (lev && dc) {
    const t = new Date(Math.min(amsAt(addDays(lev, -14), 8, 45).getTime(), Date.now() - 3600_000));
    await db.update(schema.events).set({ createdAt: t }).where(eq(schema.events.id, dc.id));
    const mail = (await db.select().from(schema.emails).where(eq(schema.emails.dossierId, dossierId))).find((m) => m.template === "koper.datumcheck");
    if (mail) await db.update(schema.emails).set({ createdAt: new Date(t.getTime() + 60_000), sentAt: new Date(t.getTime() + 60_000) }).where(eq(schema.emails.id, mail.id));
    await updateDossier(dossierId, (d) => { if (d.datumCheck.gevraagdOp) d.datumCheck.gevraagdOp = t.toISOString(); });
  }
  const parties = await db.select().from(schema.parties).where(eq(schema.parties.dossierId, dossierId));
  // Kopers met een account: actief vanaf het DVO-akkoord (de medekoper een paar dagen later).
  const startKoper = dvo ?? evs[0]?.createdAt;
  if (startKoper) for (const p of parties.filter((x) => x.side === "koper" && x.activatedAt)) {
    await db.update(schema.parties).set({ activatedAt: new Date(Math.min(startKoper.getTime() + (p.isPrimary ? 0 : 3 * 86400_000), Date.now() - 3600_000)) }).where(eq(schema.parties.id, p.id));
  }
  for (const e of evs.filter((x) => x.type === "verkoper.uitgenodigd")) {
    const p = parties.find((x) => x.side === "verkoper" && e.message.includes(x.displayName));
    if (!p) continue;
    const day = new Date(e.createdAt.getTime() + amsOffset(e.createdAt) * 60000).toISOString().slice(0, 10);
    const activated = new Date(Math.min((amsHour(e.createdAt) < 19 ? amsAt(day, 19, 40) : amsAt(addDays(day, 1), 9, 25)).getTime(), Date.now() - 3600_000));
    await db.update(schema.parties).set({ invitedAt: e.createdAt, ...(p.activatedAt ? { activatedAt: activated } : {}) }).where(eq(schema.parties.id, p.id));
  }
  const po = await db.select().from(schema.payoffs).where(eq(schema.payoffs.dossierId, dossierId));
  for (const p of po) if (p.documentId && p.receivedAt) await db.update(schema.documents).set({ createdAt: p.receivedAt }).where(eq(schema.documents.id, p.documentId));
}

/**
 * Verdeel de tijdstempels van gebeurtenissen realistisch over een periode die eindigt op
 * `end` (standaard nu). E-mails krijgen het tijdstip van de gebeurtenis waarbij ze zijn
 * verstuurd, zodat tijdlijn en e-maillog niet uiteenlopen. Niets komt in de toekomst.
 */
async function spreadTimeline(dossierId: string, days: number, end = Date.now()) {
  const db = await getDb();
  const evs = await db.select().from(schema.events).where(eq(schema.events.dossierId, dossierId)).orderBy(asc(schema.events.createdAt));
  const mails = await db.select().from(schema.emails).where(eq(schema.emails.dossierId, dossierId)).orderBy(asc(schema.emails.createdAt));
  const start = end - days * 86400_000;
  const span = days * 86400_000 - 3600_000;
  const latest = Math.min(end, Date.now()) - 3600_000;
  const placed: { orig: number; at: Date }[] = [];
  for (const [i, e] of evs.entries()) {
    const at = new Date(start + (span * i) / Math.max(1, evs.length - 1));
    const h = amsHour(at);
    if (h < 8 || h > 20) at.setTime(amsAt(new Date(at.getTime() + amsOffset(at) * 60000).toISOString().slice(0, 10), 8 + (i % 9), at.getUTCMinutes()).getTime());
    if (at.getTime() > latest) at.setTime(latest - (evs.length - i) * 60_000);
    placed.push({ orig: e.createdAt.getTime(), at });
    await db.update(schema.events).set({ createdAt: at }).where(eq(schema.events.id, e.id));
  }
  for (const m of mails) {
    // Gebeurtenis die het dichtst bij het oorspronkelijke verzendmoment lag.
    const near = placed.reduce<{ orig: number; at: Date } | undefined>((best, p) => (!best || Math.abs(p.orig - m.createdAt.getTime()) < Math.abs(best.orig - m.createdAt.getTime()) ? p : best), undefined);
    const at = near ? new Date(near.at.getTime() + 60_000) : new Date(start);
    await db.update(schema.emails).set({ createdAt: at, sentAt: at }).where(eq(schema.emails.id, m.id));
  }
  await db.update(schema.dossiers).set({ createdAt: new Date(start) }).where(eq(schema.dossiers.id, dossierId));
}

async function seedPipeline() {
  const db = await getDb();
  const extra: { adres: string; nr: string; postcode: string; plaats: string; prijs: number; koper: [string, string, string]; verkoper: [string, string, string]; levering: number; service: "beide" | "levering" | "hypotheek"; stage: "wacht" | "intake" | "bij_notaris" | "gepasseerd" }[] = [
    { adres: "Kerkstraat", nr: "3", postcode: "3832 AB", plaats: "Leusden", prijs: 412500, koper: ["Femke", "Jansen", "1995-06-21"], verkoper: ["Gerrit", "Brouwer", "1958-11-02"], levering: 38, service: "beide", stage: "intake" },
    { adres: "Parkweg", nr: "88", postcode: "1217 HT", plaats: "Hilversum", prijs: 0, koper: ["Yusuf", "Demir", "1992-01-15"], verkoper: ["", "", ""], levering: 61, service: "beide", stage: "wacht" },
    { adres: "Van Goghlaan", nr: "2", postcode: "3764 XP", plaats: "Soest", prijs: 538000, koper: ["Lisa", "van der Berg", "1988-09-30"], verkoper: ["Ahmed", "El Amrani", "1975-04-12"], levering: -6, service: "levering", stage: "gepasseerd" },
    { adres: "Dorpsstraat", nr: "12", postcode: "3743 EC", plaats: "Baarn", prijs: 0, koper: ["Kees", "Hoekstra", "1979-12-08"], verkoper: ["", "", ""], levering: 9, service: "hypotheek", stage: "bij_notaris" },
  ];
  for (const e of extra) {
    const id = await createConceptDossier(e.service, token(), true);
    const lev = workday(addDays(todayIso(), e.levering));
    const passed = e.stage === "gepasseerd";
    const levTs = (h: number, plusDays = 0) => amsAt(addDays(lev, plusDays), h);
    const spanDays = Math.max(8, 45 - Math.max(0, e.levering));
    const timelineEnd = passed ? levTs(18, -1).getTime() : Date.now();
    const timelineStart = timelineEnd - spanDays * 86400_000;
    const startDate = new Date(timelineStart).toISOString().slice(0, 10);
    const afgewikkeld = amsAt(workday(addDays(lev, 1)), 11);
    await updateDossier(id, (d) => {
      d.property = { straat: e.adres, huisnummer: e.nr, postcode: e.postcode, plaats: e.plaats, soort: "woning" };
      d.transaction = { koopprijs: e.prijs || undefined, leveringsdatum: lev, leveringsdatumOrigineel: lev, leveringsdatumStatus: passed ? "bevestigd" : "voorlopig", datumOndertekening: addDays(startDate, -3) };
      if (passed) d.datumCheck = { gevraagdOp: levTs(9, -14).toISOString(), antwoord: "ja", beantwoordOp: levTs(20, -13).toISOString() };
      d.dvo = { version: DVO_VERSION, acceptedAt: amsAt(addDays(startDate, -1), 9, 30).toISOString(), acceptedBy: "demo", signatureName: `${e.koper[0]} ${e.koper[1]}`, checks: ["dvo", "voorwaarden", "volmacht", "juist"] };
      d.koStatus = e.stage === "wacht" || e.service === "hypotheek" ? "ontbreekt" : "verwerkt";
      d.financing = { ...d.financing, hypotheek: e.service === "levering" ? "nee" : "ja", status: "offerte_geaccepteerd", eigenMiddelen: "ja", bevestigd: e.stage !== "wacht", geldverstrekker: e.service === "levering" ? undefined : "Demo Hypotheekbank N.V. (fictief)", hypotheekbedragIndicatie: e.prijs ? Math.round(e.prijs * 0.85) : 300000 };
    });
    const kp = { ...emptyPartyData(), person: { voornamen: e.koper[0], achternaam: e.koper[1], geboortedatum: e.koper[2], geboorteplaats: "Utrecht", nationaliteit: "Nederlandse", adres: "Demoweg 1", postcode: "3500 AA", woonplaats: "Utrecht", burgerlijkeStaat: "ongehuwd" as const } };
    const advanced = e.stage === "bij_notaris" || e.stage === "gepasseerd";
    if (advanced) {
      kp.gegevensBevestigd = true;
      kp.pep = { antwoord: "nee" };
      kp.idcheck = { status: "voltooid", methode: "idin", resultaat: { naam: `${e.koper[0]} ${e.koper[1]}`, geboortedatum: e.koper[2], documentType: "Paspoort" }, match: { naam: true, geboortedatum: true } };
      kp.volmacht = { status: "ondertekend", ondertekendOp: (passed ? levTs(11, -10) : new Date(Date.now() - 3 * 86400_000)).toISOString(), ondertekeningMethode: "video" };
    }
    if (e.stage === "intake") { kp.idcheck = { status: "in_behandeling" }; }
    await db.insert(schema.parties).values({ id: uid(), dossierId: id, side: "koper", isPrimary: true, email: `${e.koper[0].toLowerCase()}@example.com`, displayName: `${e.koper[0]} ${e.koper[1]}`, data: kp, activatedAt: new Date() });
    if (e.verkoper[0]) {
      const vp = { ...emptyPartyData(), person: { voornamen: e.verkoper[0], achternaam: e.verkoper[1], geboortedatum: e.verkoper[2], geboorteplaats: "Amersfoort", nationaliteit: "Nederlandse", adres: `${e.adres} ${e.nr}`, postcode: e.postcode, woonplaats: e.plaats, burgerlijkeStaat: "gehuwd" as const, partnerNaam: "(echtgenote, demo)" } };
      if (advanced) { vp.gegevensBevestigd = true; vp.idcheck = { status: "voltooid" }; vp.volmacht = { status: "ondertekend", legalisatie: "niet_vereist" }; vp.iban = { iban: "NL02RABO0123456789", tenaamstelling: `${e.verkoper[0][0]}. ${e.verkoper[1]}`, bevestigd: true }; vp.meta = { zekerhedenBevestigd: { source: "klant" } }; }
      await db.insert(schema.parties).values({ id: uid(), dossierId: id, side: "verkoper", isPrimary: true, email: `${e.verkoper[0].toLowerCase()}.verkoper@example.com`, displayName: `${e.verkoper[0]} ${e.verkoper[1]}`, data: vp });
    }
    if (e.stage !== "wacht" && e.service !== "hypotheek") {
      await saveDocument({ dossierId: id, kind: "koopovereenkomst", filename: `koopovereenkomst-${e.adres.toLowerCase().replace(/\s/g, "-")}.pdf`, mime: "application/pdf", content: await genericKoPdf({ adres: `${e.adres} ${e.nr}`, postcode: e.postcode, plaats: e.plaats, koopprijs: e.prijs, koper: `${e.koper[0]} ${e.koper[1]}`, verkoper: `${e.verkoper[0]} ${e.verkoper[1]}`, levering: lev }), source: "upload", visibility: "partijen" });
    }
    if (e.service === "hypotheek") await updateDossier(id, (d) => { d.wwft = { bronnen: [], status: "niet_van_toepassing" }; d.financing.eigenMiddelen = "nee"; d.koperIban = { iban: "NL44RABO0123456780", tenaamstelling: "K. Hoekstra", bevestigd: true }; d.financing.bankinstructie = { geldverstrekker: "Demo Hypotheekbank N.V. (fictief)", kenmerk: "DHB-2026-5512", hypotheekbedrag: 315000, inschrijvingsbedrag: 393750, leningdelen: [{ soort: "Annuïteitenlening", bedrag: 315000 }], rang: "Eerste in rang", algemeneVoorwaarden: "Algemene Voorwaarden Demo Hypotheekbank 2026 (fictief)", bijzondereVoorwaarden: [], controlepunten: [] }; d.financing.bankinstructieStatus = "ontvangen"; });
    if (advanced) await updateDossier(id, (d) => { d.wwft = { ...d.wwft, ingediendOp: (passed ? levTs(14, -20) : new Date(Date.now() - 6 * 86400_000)).toISOString(), status: d.wwft.status ?? "aangeleverd" }; d.koperIban = { iban: "NL44RABO0123456780", tenaamstelling: `${e.koper[0][0]}. ${e.koper[1]}`, bevestigd: true }; });
    await db.update(schema.dossiers).set({ status: e.stage === "wacht" ? "wacht_op_ko" : e.stage === "gepasseerd" ? "bij_notaris" : "intake", draftToken: null }).where(eq(schema.dossiers.id, id));
    await runAutomations(id, "seed");
    if (passed) {
      // Afgewikkeld dossier: eerst alles compleet maken (aflosnota ontvangen en gecontroleerd,
      // nota's herberekend), pas daarna passeren, inschrijven en afwikkelen.
      for (const po of await db.select().from(schema.payoffs).where(eq(schema.payoffs.dossierId, id))) {
        await db.update(schema.payoffs).set({ status: "gecontroleerd", toestemmingVerkoper: true, loanNumbers: "4400 7788 12", amount: Math.round(e.prijs * 0.42) * 100, validUntil: lev, requestedAt: levTs(10, -16), receivedAt: levTs(15, -9) }).where(eq(schema.payoffs.id, po.id));
      }
      await runAutomations(id, "seed");
      await db.update(schema.checks).set({ status: "akkoord", decidedBy: "Lotte van Dam", decidedAt: levTs(16, -3) }).where(eq(schema.checks.dossierId, id));
      await updateDossier(id, (d) => {
        d.gepasseerdOp = levTs(10).toISOString(); d.ingeschrevenOp = levTs(12).toISOString(); d.afgewikkeldOp = afgewikkeld.toISOString();
        if (d.notaKoper) d.notaKoper.status = "definitief";
        if (d.akteLevering) d.akteLevering.status = "definitief";
        if (d.notaVerkoper) { d.notaVerkoper.status = "definitief"; d.notaVerkoper.uitbetaaldOp = d.afgewikkeldOp; }
        return { status: "afgewikkeld" };
      });
    }
    if (e.stage === "bij_notaris") await runAutomations(id, "seed");
    await spreadTimeline(id, spanDays, timelineEnd);
    await alignWithTimeline(id);
    if (passed) {
      for (const [type, message, at] of [["akte.gepasseerd", "Akte van levering gepasseerd bij de notaris.", levTs(10)], ["kadaster.ingeschreven", "Akte ingeschreven in het Kadaster.", levTs(12)], ["dossier.afgewikkeld", "Dossier financieel afgewikkeld: verkoopopbrengst uitbetaald.", afgewikkeld]] as const) {
        await logEvent({ dossierId: id, actorType: type === "akte.gepasseerd" ? "notaris" : "systeem", actorName: type === "akte.gepasseerd" ? "Lotte van Dam" : undefined, type, message, visibleTo: "partijen" });
        const [ev] = await db.select().from(schema.events).where(and(eq(schema.events.dossierId, id), eq(schema.events.type, type)));
        if (ev) await db.update(schema.events).set({ createdAt: at }).where(eq(schema.events.id, ev.id));
      }
    }
  }
}
