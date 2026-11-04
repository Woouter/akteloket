import "server-only";
import { asc, eq } from "drizzle-orm";
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
  await seedDemo();
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
    d.koperIban = { iban: "NL91ABNA0417164300", tenaamstelling: "S.M. de Vries en D.P. Bakker", bevestigd: true, bevestigdOp: new Date().toISOString() };
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
      d.gegevensBevestigdOp = new Date().toISOString();
      d.pep = { antwoord: "nee", beantwoordOp: new Date().toISOString() };
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
  const afschrift = await saveDocument({ dossierId: id, partyId: sanne.id, kind: "wwft_bewijs", title: "Rekeningafschrift spaarrekening", filename: "spaarrekening-afschrift.pdf", mime: "application/pdf", content: await bankafschriftPdf(), source: "upload", visibility: "koper", meta: { bron: "spaargeld" } });
  const schenking = await saveDocument({ dossierId: id, partyId: sanne.id, kind: "wwft_bewijs", title: "Schenkingsovereenkomst ouders", filename: "schenkingsovereenkomst.pdf", mime: "application/pdf", content: await schenkingPdf(), source: "upload", visibility: "koper", meta: { bron: "schenking" } });
  await updateDossier(id, (d) => {
    d.wwft = {
      status: "aangeleverd",
      ingediendOp: addDays(todayIso(), -15) + "T10:12:00.000Z",
      bronnen: [
        { id: uid(), type: "spaargeld", bedrag: 35000, beschikbaar: "helemaal", rekening: "gezamenlijk", eigenaarGeld: "mij_en_partner", overgemaakt: "ja", details: { opbouw: "Loon of regulier inkomen" }, documentIds: [afschrift] },
        { id: uid(), type: "schenking", bedrag: 25000, beschikbaar: "helemaal", rekening: "eigen", eigenaarGeld: "mij", overgemaakt: "ja", details: { van: "Ouders", relatie: "Ouders van Sanne (A. de Vries en J. de Vries-Mulder)", ontvangen: "ja", voorwaarden: "nee" }, documentIds: [schenking] },
      ],
    };
  });

  // Volmachtafspraken: Sanne getekend (video), Daan gepland
  const past = new Date(Date.now() - 4 * 86400_000); past.setHours(10, 30, 0, 0);
  const future = new Date(Date.now() + 2 * 86400_000); if (future.getDay() === 0) future.setDate(future.getDate() + 1); if (future.getDay() === 6) future.setDate(future.getDate() + 2); future.setHours(16, 0, 0, 0);
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
      d.gegevensBevestigdOp = new Date().toISOString();
      d.idcheck = { status: "voltooid", methode: i === 0 ? "idin" : "nfc_app", provider: i === 0 ? "iDIN (demo)" : "ID-app met NFC-chip (demo)", voltooidOp: addDays(todayIso(), -25), resultaat: { naam: `${x.voornamen} ${x.achternaam}`, geboortedatum: x.geboortedatum, documentType: i === 0 ? "Identiteitskaart" : "Paspoort", documentNummerMasked: i === 0 ? "IR•••••3D" : "NP•••••9Q", geldigTot: "2030-02-01" }, match: { naam: true, geboortedatum: true } };
      d.iban = { iban: "NL20INGB0001234567", tenaamstelling: "H.J. Jansen en M.E. Visser", bevestigd: true, bevestigdOp: new Date().toISOString(), verdeling: "Gezamenlijke rekening (beide 50%)" };
      d.meta = { ...(d.meta ?? {}), zekerhedenBevestigd: { source: "klant", confirmedAt: new Date().toISOString() } };
    });
  }
  await db.update(schema.users).set({ name: "Marijke Visser" }).where(eq(schema.users.id, marijkeUser.id));
  await runAutomations(id, "seed");
  // Verkoper-volmachten getekend
  for (const v of [henk, marijke]) await updateParty(v.id, (d) => { d.volmacht = { ...(d.volmacht ?? { status: "te_plannen" }), status: "ondertekend", ondertekendOp: addDays(todayIso(), -9) + "T14:00:00.000Z", ondertekeningMethode: "video", legalisatie: "niet_vereist", ontvangenOp: addDays(todayIso(), -9) + "T14:05:00.000Z" }; });

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
  await updateDossier(id, (d) => { d.financing.bankinstructie = { ...bi.data, ontvangenOp: new Date().toISOString(), documentId: biDoc }; d.financing.bankinstructieStatus = "ontvangen"; });
  await runAutomations(id, "seed");

  // Notaris heeft N1 al akkoord gegeven; de rest staat open voor de demo
  const n1 = (await db.select().from(schema.checks).where(eq(schema.checks.dossierId, id))).find((c) => c.key === "wwft_id");
  if (n1) await db.update(schema.checks).set({ status: "akkoord", decidedBy: "Lotte van Dam", decidedAt: new Date(Date.now() - 86400_000), comment: "ID's en Wwft-stukken gecontroleerd. Schenking ouders voldoende onderbouwd." }).where(eq(schema.checks.id, n1.id));
  await logEvent({ dossierId: id, actorType: "notaris", actorName: "Lotte van Dam", type: "check.akkoord", message: "N1 Wwft-uitvraag en identificatie: akkoord." });

  await spreadTimeline(id, 33);
}

/** Verdeel de tijdstempels van gebeurtenissen en e-mails realistisch over de afgelopen dagen. */
async function spreadTimeline(dossierId: string, days: number) {
  const db = await getDb();
  const evs = await db.select().from(schema.events).where(eq(schema.events.dossierId, dossierId)).orderBy(asc(schema.events.createdAt));
  const start = Date.now() - days * 86400_000;
  const span = days * 86400_000 - 3600_000;
  for (const [i, e] of evs.entries()) {
    const at = new Date(start + (span * i) / Math.max(1, evs.length - 1));
    if (at.getHours() < 8) at.setHours(8 + (i % 9));
    await db.update(schema.events).set({ createdAt: at }).where(eq(schema.events.id, e.id));
  }
  const mails = await db.select().from(schema.emails).where(eq(schema.emails.dossierId, dossierId)).orderBy(asc(schema.emails.createdAt));
  for (const [i, m] of mails.entries()) {
    const at = new Date(start + (span * (i + 1)) / (mails.length + 1));
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
    const lev = addDays(todayIso(), e.levering);
    await updateDossier(id, (d) => {
      d.property = { straat: e.adres, huisnummer: e.nr, postcode: e.postcode, plaats: e.plaats, soort: "woning" };
      d.transaction = { koopprijs: e.prijs || undefined, leveringsdatum: lev, leveringsdatumOrigineel: lev, leveringsdatumStatus: "voorlopig", datumOndertekening: addDays(todayIso(), e.levering - 45) };
      d.dvo = { version: "DVO-2026.11-v1", acceptedAt: new Date(Date.now() - 20 * 86400_000).toISOString(), acceptedBy: "demo", signatureName: `${e.koper[0]} ${e.koper[1]}`, checks: ["dvo", "voorwaarden", "volmacht", "juist"] };
      d.koStatus = e.stage === "wacht" || e.service === "hypotheek" ? "ontbreekt" : "verwerkt";
      d.financing = { ...d.financing, hypotheek: e.service === "levering" ? "nee" : "ja", status: "offerte_geaccepteerd", eigenMiddelen: "ja", bevestigd: e.stage !== "wacht", geldverstrekker: e.service === "levering" ? undefined : "Demo Hypotheekbank N.V. (fictief)", hypotheekbedragIndicatie: e.prijs ? Math.round(e.prijs * 0.85) : 300000 };
    });
    const kp = { ...emptyPartyData(), person: { voornamen: e.koper[0], achternaam: e.koper[1], geboortedatum: e.koper[2], geboorteplaats: "Utrecht", nationaliteit: "Nederlandse", adres: "Demoweg 1", postcode: "3500 AA", woonplaats: "Utrecht", burgerlijkeStaat: "ongehuwd" as const } };
    const advanced = e.stage === "bij_notaris" || e.stage === "gepasseerd";
    if (advanced) {
      kp.gegevensBevestigd = true;
      kp.pep = { antwoord: "nee" };
      kp.idcheck = { status: "voltooid", methode: "idin", resultaat: { naam: `${e.koper[0]} ${e.koper[1]}`, geboortedatum: e.koper[2], documentType: "Paspoort" }, match: { naam: true, geboortedatum: true } };
      kp.volmacht = { status: "ondertekend", ondertekendOp: new Date().toISOString() };
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
    if (advanced) await updateDossier(id, (d) => { d.wwft = { ...d.wwft, ingediendOp: new Date().toISOString(), status: d.wwft.status ?? "aangeleverd" }; d.koperIban = { iban: "NL44RABO0123456780", tenaamstelling: `${e.koper[0][0]}. ${e.koper[1]}`, bevestigd: true }; });
    await db.update(schema.dossiers).set({ status: e.stage === "wacht" ? "wacht_op_ko" : e.stage === "gepasseerd" ? "bij_notaris" : "intake", draftToken: null }).where(eq(schema.dossiers.id, id));
    await runAutomations(id, "seed");
    if (e.stage === "gepasseerd") {
      await db.update(schema.checks).set({ status: "akkoord", decidedBy: "Lotte van Dam", decidedAt: new Date(Date.now() - 7 * 86400_000) }).where(eq(schema.checks.dossierId, id));
      await updateDossier(id, (d) => { d.gepasseerdOp = addDays(todayIso(), e.levering) + "T09:30:00.000Z"; d.ingeschrevenOp = addDays(todayIso(), e.levering) + "T11:02:00.000Z"; d.afgewikkeldOp = addDays(todayIso(), e.levering + 1) + "T10:00:00.000Z"; if (d.notaKoper) d.notaKoper.status = "definitief"; if (d.akteLevering) d.akteLevering.status = "definitief"; if (d.notaVerkoper) { d.notaVerkoper.status = "definitief"; d.notaVerkoper.uitbetaaldOp = d.afgewikkeldOp; } d.datumCheck = { gevraagdOp: new Date().toISOString(), antwoord: "ja", beantwoordOp: new Date().toISOString() }; return { status: "afgewikkeld" }; });
    }
    if (e.stage === "bij_notaris") await runAutomations(id, "seed");
    await spreadTimeline(id, Math.max(8, 45 - Math.max(0, e.levering)));
  }
}
